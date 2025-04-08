let templ = document.createElement('template');
templ.innerHTML = `
<style>
  :host { display: block; }
  #container {
    overflow-x: auto;
    padding-top: 5px;
  }
</style>
<div id="container">
  <canvas id="canvas"></canvas>
</div>
`

// This is needed so that the Shady DOM polyfill scopes
// the styles correctly.
if (window.ShadyCSS)
  window.ShadyCSS.prepareTemplate(templ, 'midi-visualizer');

const COLOR_MODE = { BY_TRACK: 0, BY_CHANNEL: 1, };

const FILTER_MODE = { BY_TRACK: 0, BY_CHANNEL: 1, };

const FILTER_VALUE = { ALL: -1, F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6, F7: 7, F8: 8, F9: 9, F10: 10, F11: 11, F12: 12, F13: 13, F14: 14, F15: 15, F16: 16  };

class MidiVisualizer extends HTMLElement 
{
  constructor() 
  {
    super();
    // Stamp the template.
    if (window.ShadyCSS)
      window.ShadyCSS.styleElement(this);
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(document.importNode(templ.content, true));

    // Cache the DOM instances we care about so that we don't
    // keep requerying for them.
    this.$ = {};
    this.$.container = this.shadowRoot.getElementById('container');
    this.$.canvas = this.shadowRoot.getElementById('canvas');

    //Mouse controls
    this._xGrabbing = false;

    this.$.canvas.addEventListener("mousedown", (event) => {this.processMouseDown(event);});
    this.$.canvas.addEventListener("mouseup", (event) => {this.processMouseUp(event);});
    this.$.canvas.addEventListener("mousemove", (event) => {this.processMouseMove(event);});
    this.$.canvas.addEventListener("mousewheel", (event) => {this.processMouseWheel(event);});
    this.$.canvas.addEventListener("mousewheel", (event) => {this.processMouseWheel(event);});

    // Initialize the visualizer and the magenta player.
    this._visualizer = null;
    this._player = new mm.SoundFontPlayer('https://storage.googleapis.com/download.magenta.tensorflow.org/soundfonts_js/sgm_plus');
    this._player.callbackObject = 
    {
      // This method is called every time we play a new note. We use
      // it to keep the visualization in sync with the audio.
      run: (note) =>
      {
        const currentNotePosition = this._visualizer.drawSequence(note);
        const positionInPX = (currentNotePosition - this.viewWindowStartPositionX) * this._pixelsPerTimeStep;
        if(positionInPX >= this.$.canvas.width || positionInPX < 0)
        {
          this.viewWindowStartPositionX = currentNotePosition - 1.0/64.0;
          this._visualizer.drawSequence(note);
        }
      },
      stop: () => 
      {
        this.dispatchEvent(new CustomEvent('playbackStopped'));
        this.currentPlayhead = 0;
      }
    };

    this._compositionLength = 0;
    this._viewWindowStartPositionX = 0;
    this._pixelsPerTimeStep = 30;
    this._colorMode = COLOR_MODE.BY_TRACK;
    this._filterMode = FILTER_MODE.BY_TRACK;
    this._filterValue = FILTER_VALUE.ALL;
  }

  /********************
   *  Properties this element exposes.
   * ******************/
  get url() { return this.getAttribute('url'); }
  set url(value) 
  {
    this.setAttribute('url', value);
    this._fetchMidi();
  }

  get tempo() { return this._player.desiredQPM; }
  set tempo(value) 
  {
    this.setAttribute('tempo', value);
    this._player.setTempo(value);
  }

  get noteSequence() { return this._noteSequence; }
  set noteSequence(value) 
  {
    if (value != this._noteSequence) 
    {
      this._noteSequence = value;
      const lastNote = this._noteSequence.notes[this._noteSequence.notes.length - 1];
      this._compositionLength = lastNote.endTime;
      this._initializeVisualizer(this._compositionLength, this.noteSequence.tempos[0].qpm, this._widthToFit, this._heightToFit);
      this.fitContent(this._widthToFit, this._heightToFit);
      this.updateFilteredNoteSequence();
      this.currentPlayhead = 0;
    }
  }

  get colorMode() { return this._visualizer.config.colorMode; }
  set colorMode(value)
  {
    var mode = -1;
    switch(value)
    {
      case 0: mode = FILTER_MODE.BY_TRACK; break;
      case 1: mode = FILTER_MODE.BY_CHANNEL; break;
    }
    this._colorMode = mode;
    this._visualizer.config.colorMode = mode;
    this._visualizer.drawSequence();
  }

  get filterMode() { return this._visualizer.config.filterMode; }
  set filterMode(value)
  {
    var mode = -1;
    switch(value)
    {
      case 0: mode = COLOR_MODE.BY_TRACK; break;
      case 1: mode = COLOR_MODE.BY_CHANNEL; break;
    }
    this._filterMode= mode;
    this._visualizer.config.filterMode = mode;
    this._visualizer.drawSequence();
  }

  get filterValue() { return this._visualizer.config.filterValue; }
  set filterValue(value)
  {
    this._filterValue = value;
    this._visualizer.config.filterValue = value;
    this.updateFilteredNoteSequence();
    this._visualizer.drawSequence();
  }

  get maxPixelsPerTimeStep() { return 1000; }

  get pixelsPerTimeStep() 
  { 
    if(this._visualizer != null)
      return this._visualizer.pixelsPerTimeStep; 
  }
  set pixelsPerTimeStep(value) 
  {
    if(this._visualizer == null)
      return;
    this._visualizer.pixelsPerTimeStep = value;
    this._visualizer.drawSequence();
  }

  setPixelsPerTimeStep(value, redraw) 
  {
    if(value <= 0)
      return;
    this._pixelsPerTimeStep = value;
    if(this._visualizer == null)
     return;
    this._visualizer.pixelsPerTimeStep = value;
    if(redraw)
      this._visualizer.drawSequence();
  }

  get compositionLength() { return this._compositionLength; }

  get viewWindowStartPositionX() { return this._viewWindowStartPositionX; }
  set viewWindowStartPositionX(value) { this.setMethodViewWindowStartPositionX(value); }
  setMethodViewWindowStartPositionX(value)
  {
    if(value < 0)
      return;
    if(value > this.compositionLength)
      return;
    if(this._visualizer == null)
      return;
    this._viewWindowStartPositionX = value;
    this._visualizer.config.viewWindowStartPositionX = value;
    this._visualizer.drawSequence();
  }

  get viewWindowStartPositionY() { return this.config.viewWindowStartPositionY; }
  set viewWindowStartPositionY(value) { this.setMethodViewWindowStartPositionY(value); }
  setMethodViewWindowStartPositionY(value)
  {
    if(value < -127 + this._visualizer.ctx.canvas.height / this._visualizer.config.noteHeight)
      return;
    if(value > 1)
      return;
    if(this._visualizer == null)
      return;

    this._visualizer.config.viewWindowStartPositionY = value;
    this._visualizer.drawSequence();
  }

  get widthToFit() { return this._widthToFit; }
  set widthToFit(value) { this._widthToFit = value; }

  get heightToFit() { return this._heightToFit; }
  set heightToFit(value) { this._heightToFit = value; }

  get timestepPerPx() { return 1 / this._visualizer.pixelsPerTimeStep; }

  changeSize(height)
  {
    this._heightToFit = height;
    this.$.canvas.height = height;
    if(this._visualizer == null)
      return;
    this._visualizer.fitContent(this._widthToFit, this._heightToFit);
  }

  copyCanvasToClipboard()
  {
    this._visualizer.ctx.canvas.toBlob(function(blob) 
    { 
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]); 
    });
  }

  processMouseDown(event)
  {
    this._xGrabbing = true;
    this._wasScaledOrMoved = false;
  }

  processMouseUp(event)
  {
    this._xGrabbing = false;
    if(!this._wasScaledOrMoved && event.movementY == 0 && event.movementX == 0)
      this.currentPlayhead = this.viewWindowStartPositionX + event.offsetX * this.timestepPerPx;
  }

  processMouseMove(event)
  {
    if(event.shiftKey && this._xGrabbing)
    {
      this._wasScaledOrMoved = true;
      this.setPixelsPerTimeStep(this._visualizer.pixelsPerTimeStep + event.movementX, true);
    }
    else if(event.ctrlKey && this._xGrabbing)
    {
      this._wasScaledOrMoved = true;
      this._visualizer.setNoteHeightPX(this._visualizer.config.noteHeight - event.movementY, true);  
    }
    else if(event.altKey && this._xGrabbing)
    {
      this._wasScaledOrMoved = true;
      this.setMethodViewWindowStartPositionY(this._visualizer.config.viewWindowStartPositionY - event.movementY / this._visualizer.config.noteHeight);
    }
    else if(this._xGrabbing)
    {
      this._wasScaledOrMoved = true;
      this.setMethodViewWindowStartPositionX(this._viewWindowStartPositionX - event.movementX * this.timestepPerPx);
    }
  }

  processMouseWheel(event)
  {
    if(event.shiftKey)
      this.setPixelsPerTimeStep(this._visualizer.pixelsPerTimeStep + event.deltaY, true);
    else if(event.ctrlKey)
      this._visualizer.setNoteHeightPX(this._visualizer.config.noteHeight - event.deltaY, true);  
    else if(event.altKey)
      this.setMethodViewWindowStartPositionY(this._visualizer.config.viewWindowStartPositionY + event.deltaY * 0.01); //0.01 is convenient scale, probably better to calculate it somehow
    else
      this.setMethodViewWindowStartPositionX(this._viewWindowStartPositionX + event.deltaY * this.timestepPerPx);
  }

  get currentPlayhead() { return this._visualizer.config.currentPlayheadPosition; }
  set currentPlayhead(value)
  {
    this._visualizer.config.currentPlayheadPosition = value;
    this.updateFilteredNoteSequence();
    this._visualizer.drawSequence();
    if(this.noteSequence)
    {
      const signature = this.getTimeSignatureAtPlayheadPosition();
      const num = signature.numerator;
      const denom = signature.denominator;
      this.dispatchEvent(new CustomEvent('playbackStopped'));
      this.dispatchEvent(new CustomEvent('updateTimeSignature', {detail: {numerator: num, denominator: denom}}));
    }
  }

  /********************
   *  Public methods this element exposes
   * ******************/

  fitContent(widthToFit, heightToFit)
  {
    if(this._visualizer == null)
      return;
    this._widthToFit = widthToFit;
    this._heightToFit = heightToFit;
    this._visualizer.fitContent(widthToFit, heightToFit);
    this.setMethodViewWindowStartPositionX(0);
  }

  isPlaying() { return this._player.isPlaying(); }

  start() 
  {
    // Reset the scroll position.
    this.setMethodViewWindowStartPositionX(0);
    mm.Player.tone.context.resume();
    this._player.start(this.filteredNoteSequence);
  }

  stop() 
  {
    this._player.stop();
    this.currentPlayhead = 0;
  }

  loadFile(blob) 
  {
    this._parseMidiFile(blob);
  }

  async loadFileURL(url)
  {
    let blob = await fetch(url).then(r => r.blob());
    this.loadFile(blob);
  }

  // Keep attributes and properties in sync.
  static get observedAttributes() { return ['url', 'tempo']; }
  attributeChangedCallback(attr, oldValue, newValue)
  {
    if (oldValue === newValue) return;
    this[attr] = newValue;
  }

  _fetchMidi() 
  {
    fetch(this.url).then(
    (response) => 
    {
      return response.blob();
    }).then(
    (blob) => 
    {      
      this._parseMidiFile(blob);
    }).catch(function(error) 
    {
      console.log('Well, something went wrong somewhere. I don\'t know', error.message);
    });
  }

  _parseMidiFile(file) 
  {
    const reader = new FileReader();

    reader.onload = async (e) => 
    {
      // This will call initializeVisualizer, so we don't have to.
      this.noteSequence = mm.midiToSequenceProto(e.target.result);
      this._player.setTempo(this.noteSequence.tempos[0].qpm);
    };

    reader.readAsBinaryString(file);
  }

  async _initializeVisualizer(compositionLength, tempo, width, height) 
  {
    this._visualizer = new NoteSequenceDrawer(this.noteSequence, this.$.canvas, width, height, compositionLength, tempo, this._colorMode, this._filterMode, this._filterValue);
    await this._player.loadSamples(this.noteSequence);
    this.dispatchEvent(new CustomEvent('visualizer-ready'));
  }

  updateFilteredNoteSequence()
  {
    let filteredNoteSequence =  { ...this._noteSequence};
    filteredNoteSequence.notes = [];
    
    for(var i = 0; i < this._noteSequence.notes.length; i++)
    {
      const note = this._noteSequence.notes[i];
      if(note.startTime < this.currentPlayhead)
        continue;
      if(this._visualizer.checkFilter(note))
        continue;
      const noteClone = { ...note};
      noteClone.startTime = noteClone.startTime - this.currentPlayhead;
      noteClone.endTime = noteClone.endTime - this.currentPlayhead;
      filteredNoteSequence.notes.push(noteClone);
    }
    this.filteredNoteSequence = filteredNoteSequence;
    this._visualizer.config.filteredTimeOffset = this.currentPlayhead;
  }

  getTimeSignatureAtPlayheadPosition()
  {
    if(!this.noteSequence)
      return {numerator: 0, denominator : 0};

    var numerator = 0;
    var denominator = 0;
    for(var i = 0; i < this.noteSequence.timeSignatures.length; i++)
    {
      const timeSignature = this.noteSequence.timeSignatures[i];
      if(this.currentPlayhead >= timeSignature.time)
      {
        numerator = timeSignature.numerator;
        denominator = timeSignature.denominator;
      }
      if(this.currentPlayhead < timeSignature.time)
        break
    }
    return {numerator: numerator, denominator : denominator};
  }
}

/*************************
 * Visualizing a NoteSequence
 *************************/
class NoteSequenceDrawer 
{
  constructor(sequence, canvas, containerWidth, containerHeight, compositionLengthArg, tempoArg, colorModeArg, filterModeArg, filterValueArg) 
  {
    this.config = 
    {
      noteHeight: 6,
      noteSpacing: 1,
      pixelsPerTimeStep: 30,  // The bigger this number the "wider" a note looks,
      minPitch: 100,
      maxPitch: 1,
      compositionLength:compositionLengthArg,
      viewWindowStartPositionX: 0,
      viewWindowStartPositionY: 0,
      tempo: tempoArg,
      colorMode: colorModeArg,
      filterMode: filterModeArg,
      filterValue: filterValueArg,
      currentPlayheadPosition: 0,
      filteredTimeOffset: 0
    }

    this.noteSequence = sequence;

    this.initializeCanvasSize(canvas, containerWidth, containerHeight);
    this.drawSequence();
  }

  initializeCanvasSize(canvas, containerWidth, containerHeight)
  {
    this.ctx = canvas.getContext('2d');
    this.ctx.canvas.width = containerWidth;
    this.ctx.canvas.height = containerHeight;
  }

  get pixelsPerTimeStep() { return this.config.pixelsPerTimeStep; }
  set pixelsPerTimeStep(value) 
  {
    if (value > 0) 
    {
      this.config.pixelsPerTimeStep = value;
      this.drawSequence();
    }
  }

  drawSequence(currentNote) 
  {
    //clear canvas
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    //define current playheadPosition
    var currentNoteStartTime = 0;
    if(currentNote)
      currentNoteStartTime = currentNote.startTime + this.config.filteredTimeOffset;
    if(this.config.currentPlayheadPosition < currentNoteStartTime)
      this.config.currentPlayheadPosition = currentNoteStartTime;

    //define canvas shifts in px
    const startOffsetPX_X = this.config.viewWindowStartPositionX * this.config.pixelsPerTimeStep;
    const startOffsetPX_Y = this.config.viewWindowStartPositionY * this.config.noteHeight;

    this.drawLanes(startOffsetPX_Y);
    this.drawBarsAndBeats(startOffsetPX_X);
    this.drawPlayhead(startOffsetPX_X);
    this.drawNotesRects(startOffsetPX_X, startOffsetPX_Y);

    return this.config.currentPlayheadPosition;
  }

  drawLanes(startOffsetPX_Y) 
  {
    const fillStyle = this.ctx.fillStyle;
    const pitchTextHeight = Math.round(this.config.noteHeight);
    const font = this.ctx.font;
    this.ctx.font = (pitchTextHeight | 0) + "px serif";
    for (let i = 0; i < 127; i += 2) 
    {
      const x = 0;
      const y = this.ctx.canvas.height - (i * this.config.noteHeight + startOffsetPX_Y);
      this.drawBackgroundLane(x, y, this.ctx.canvas.width, this.config.noteHeight, `rgba(210, 210, 210, 255)`, i);
      const y2 = this.ctx.canvas.height - ((i + 1) * this.config.noteHeight + startOffsetPX_Y);
      this.drawBackgroundLane(x, y2, this.ctx.canvas.width, this.config.noteHeight, `rgba(240, 240, 240, 255)`, i + 1);
      this.ctx.strokeText(this.pitchToPitchAndOctave(i), x, y + pitchTextHeight);
      this.ctx.strokeText(this.pitchToPitchAndOctave(i + 1), x, y2 + pitchTextHeight);
    }
    this.ctx.fillStyle = fillStyle;
    this.ctx.font = font;
  }

  drawBackgroundLane(x, y, w, h, color, i)
  {
    if(y + this.config.noteHeight < 0 || y > this.config.heightToFit)
      return;

    var height = h;
    if(y < 0)
    {
      height += y;
      y = 0;
    }

    if(y + height > this.config.heightToFit)
      height = this.config.heightToFit - y;
    this.ctx.fillStyle=color; 
    this.ctx.fillRect(x, y, w, height);
  }

  drawBarsAndBeats(startOffsetPX_X) 
  {
    //console.log("TImeSig: " + Object.keys(this.noteSequence.timeSignatures[0]));
    const numerator = Number.parseFloat(this.noteSequence.timeSignatures[0].numerator);
    const denominator = Number.parseFloat(this.noteSequence.timeSignatures[0].denominator);
    // const barWidth = this.config.pixelsPerTimeStep * 120.0 / this.config.tempo;
    const barWidth = this.config.pixelsPerTimeStep * 120.0 / this.config.tempo * numerator / denominator * 2;
    const quarterWidth = barWidth / numerator;
    const barsLength = 10000; //intentionally big number, so bars lines are drawn after note sequence ends. 
    const strokeStyle = this.ctx.strokeStyle;
    const lineWidth = this.ctx.lineWidth;
    this.ctx.lineWidth = 1;

    if (barWidth > 20) 
    {
      this.ctx.beginPath();
      const barNumPxHeight = Math.round(this.ctx.canvas.height / 20);
      this.ctx.font = (barNumPxHeight | 0) + "px serif";
      this.ctx.strokeStyle = `rgba(0, 0, 0, 150)`;
      for (let i = 0; i < barsLength; i++) 
      {
        const barX = i * barWidth - startOffsetPX_X;
        if (barX > this.ctx.canvas.width)
          break;

        if (barX < 0)
          continue; 
        
        this.ctx.moveTo(barX, 0);
        this.ctx.lineTo(barX, this.ctx.canvas.height);
        this.ctx.stroke();
        this.ctx.strokeText(i, barX + 2, this.ctx.canvas.height / 20);
      }
      this.ctx.closePath();
    }

    if (quarterWidth > 20) 
    {
      this.ctx.beginPath();
      this.ctx.strokeStyle = `rgba(150, 150, 150, 50)`;
      for (let i = 0; i < barsLength; i++) 
      {
        const barX = i * barWidth - startOffsetPX_X;
        if (barX > this.ctx.canvas.width)
          break;

        if (quarterWidth > 20) 
        {
          for(let k = 1; k <= numerator; k++)
          {
            this.ctx.moveTo(barX + (quarterWidth * k), 0);
            this.ctx.lineTo(barX + (quarterWidth * k), this.ctx.canvas.height);
            this.ctx.stroke();
          }
        }
      }
      this.ctx.closePath();
    }

    this.ctx.strokeStyle = strokeStyle;
    this.ctx.lineWidth = lineWidth;
  }

  drawPlayhead(startOffsetPX_X) 
  {
    const strokeStyle = this.ctx.strokeStyle;
    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(255, 0, 255, 255)`;
    this.ctx.moveTo(this.config.currentPlayheadPosition * this.config.pixelsPerTimeStep - startOffsetPX_X, 0);
    this.ctx.lineTo(this.config.currentPlayheadPosition * this.config.pixelsPerTimeStep - startOffsetPX_X, this.ctx.canvas.height);
    this.ctx.stroke();
    this.ctx.closePath();
    this.ctx.strokeStyle = strokeStyle;
  }

  drawNotesRects(startOffsetPX_X, startOffsetPX_Y) 
  {
    const canvasWidth = this.ctx.canvas.width;
    var tracksNamesPrinted = [];
    const lineWidth = this.ctx.lineWidth;
    this.ctx.lineWidth = 1;
    const noteNameFontHeight = Math.round(this.config.noteHeight);
    const font = this.ctx.font;
    this.ctx.font = (noteNameFontHeight | 0) + 'px serif';

    for (let i = 0; i < this.noteSequence.notes.length; i++) 
    {
      const note = this.noteSequence.notes[i];

      if (this.checkFilter(note))
        continue;

      const isPaintingCurrentNote = this.isPaintingCurrentNote(note, this.config.currentPlayheadPosition);

      //Just in case gather track names
      var trackName = "";
      if (this.noteSequence.trackNames != undefined && this.noteSequence.trackNames.length > note.track)
        trackName = this.noteSequence.trackNames[note.track];
      if (!tracksNamesPrinted.includes(note.track))
        tracksNamesPrinted.push(note.track);

      // Size of this note.
      var x = (note.startTime * this.config.pixelsPerTimeStep) - startOffsetPX_X;
      var w = (note.endTime - note.startTime) * this.config.pixelsPerTimeStep;

      //Skip note out of view
      if ((x + w) <= 0)
        continue;
      if (x <= 0) 
      {
        w = w + x;
        x = 0;
      }

      //Skip note out of view
      if ((x) >= canvasWidth)
        continue;

      if ((x + w) >= canvasWidth)
        w = canvasWidth - x;

      // Note that the canvas y=0 is at the top, but a smaller pitch is actually lower,
      // so we're kind of painting backwards.
      var y = this.ctx.canvas.height - (note.pitch * this.config.noteHeight + startOffsetPX_Y);
      var height = this.config.noteHeight;

      if (y + height < 0)
        continue;
      if (y < 0) 
      {
        height += y;
        y = 0;
      }
      if (y + height > this.ctx.canvas.height) 
        height = this.config.heightToFit - y;

      //Define note's color
      const opacity = note.velocity / 100 + 0.2;
      var colorDefiningNumber = -1;
      switch (this.config.colorMode) 
      {
        case COLOR_MODE.BY_TRACK:
          colorDefiningNumber = note.track;
          break;
        case COLOR_MODE.BY_CHANNEL:
          colorDefiningNumber = note.channel + 1;
          break;
      }

      var { red, green, blue } = this.getColorByTrackAndCurrent(colorDefiningNumber, isPaintingCurrentNote);

      //Draw note's rect
      this.ctx.fillStyle = `rgba(${red * opacity}, ${green * opacity}, ${blue * opacity}, 255)`; // dark blue
      this.ctx.fillRect(x, y, w, height);
      //Draw note's pitch class
      if (w > this.config.noteHeight)
        this.ctx.strokeText(this.pitchToPitchClass(note.pitch), x + this.config.pixelsPerTimeStep / 32, y + this.config.noteHeight * 0.85);
    }

    this.ctx.font = font;
    this.ctx.lineWidth = lineWidth;
  }

  checkFilter(note)
  {
    if(this.config.filterValue == FILTER_VALUE.ALL)
      return false;

    if(this.config.filterMode == FILTER_MODE.BY_TRACK)
    {
      if(note.track != this.config.filterValue)
        return true;
    }
    else if(this.config.filterMode == FILTER_MODE.BY_CHANNEL)
    {
      const channel = note.channel + 1;
      if(channel != this.config.filterValue)
        return true;
    }

    return false;
  }

  getColorByTrackAndCurrent(trackNumber, isCurrent)
  {
    let r = 255;
    let g = 255;
    let b = 255;
    switch(trackNumber)
    {
      case  1 : r = 255; g = 102; b = 102; break;
      case  8 : r = 255; g = 178; b = 102; break;
      case  2 : r = 255; g = 255; b = 102; break;
      case  9 : r = 178; g = 255; b = 102; break;
      case  3 : r = 102; g = 255; b = 102; break;
      case 10 : r = 102; g = 255; b = 178; break;
      case  4 : r = 102; g = 255; b = 255; break;
      case 11 : r = 102; g = 178; b = 255; break;
      case  5 : r = 102; g = 102; b = 255; break;
      case 12 : r = 178; g = 102; b = 255; break;
      case  6 : r = 255; g = 102; b = 255; break;
      case 13 : r = 255; g = 204; b = 204; break;
      case  7 : r = 255; g = 229; b = 204; break;
      case 14 : r = 255; g = 255; b = 204; break;
      case 15 : r = 255; g = 255; b = 204; break;
      case 16 : r = 255; g = 255; b = 204; break;
      default: r = 0; g = 0; b = 255; break; //For midi_format_0?
    }
    if(isCurrent)
    {
      r = r / 2;
      g = g / 2;
      b = b / 2;
    }

    return {red: r, green: g, blue: b};
  }

  pitchToPitchClass(pitch)
  {
    const pc = pitch % 12;
    switch(pc)
    {
      case 0 : return "C";
      case 1 : return "C#";
      case 2 : return "D";
      case 3 : return "D#";
      case 4 : return "E";
      case 5 : return "F";
      case 6 : return "F#";
      case 7 : return "G";
      case 8 : return "G#";
      case 9 : return "A";
      case 10 : return "A#";
      case 11 : return "B";
      default: return "-";
    }
  }

  pitchToPitchAndOctave(pitch)
  {
    const pc = pitch % 12;
    const octave = Math.floor(pitch / 12) - 2;
    switch(pc)
    {
      case 0 : return "C " + octave;
      case 1 : return "C#" + octave;
      case 2 : return "D " + octave;
      case 3 : return "D#" + octave;
      case 4 : return "E " + octave;
      case 5 : return "F " + octave;
      case 6 : return "F#" + octave;
      case 7 : return "G " + octave;
      case 8 : return "G#" + octave;
      case 9 : return "A " + octave;
      case 10 : return "A#" + octave;
      case 11 : return "B " + octave;
      default: return "-";
    }
  }

  isPaintingCurrentNote(note, playheadPosition) 
  {
    return (note.startTime <= playheadPosition) 
            &&
            (note.endTime > playheadPosition);
  }

  setNoteHeightPX(value, redraw)
  {
    if(value < 0 || value < this.ctx.canvas.height / 127)
      return;

    if(value >= this.ctx.canvas.height / 12)
      return;

    this.config.noteHeight = value;

    if(this.config.viewWindowStartPositionY < -127 + this.ctx.canvas.height / this.config.noteHeight)
      this.config.viewWindowStartPositionY = -127 + this.ctx.canvas.height / this.config.noteHeight;

    if(redraw)
      this.drawSequence();
  }

  fitContent(widthToFit, heightToFit)
  {
    if(this.noteSequence.notes.length == 0)
      return;

    //Find the smallest pitch so that we cans scale the drawing correctly.
    const padding = 4;
    for (let note of this.noteSequence.notes) 
    {
      if (note.pitch - padding < this.config.minPitch) 
        this.config.minPitch = note.pitch - padding;
      if (note.pitch + padding > this.config.maxPitch) 
        this.config.maxPitch = note.pitch + padding;
    }

    //Height of the canvas based on the range of pitches in the sequence
    this.config.noteHeight = heightToFit / (this.config.maxPitch - this.config.minPitch);

    const numNotes = this.noteSequence.notes.length;
    const firstNote = this.noteSequence.notes[0];
    const lastNote = this.noteSequence.notes[numNotes - 1];
    const timeLength = lastNote.endTime - firstNote.startTime;
    if(timeLength > 0)
    {
      this.config.pixelsPerTimeStep = widthToFit / timeLength;
      this.config.viewWindowStartPositionY = -this.config.minPitch;
      this.drawSequence();
    }
  }

}

if(!window.customElements.get('midi-visualizer'))
{
  window.customElements.define('midi-visualizer', MidiVisualizer);
}