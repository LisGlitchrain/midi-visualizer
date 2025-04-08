//var controls = new MainControls();

class MainControls
{
  constructor() 
  {
    //import("midi-visualizer.js");

    this.$widget = $(document);

    this.$visualizer = this.$widget.find("#visualizer");
    this.$playBtn = this.$widget.find("#playBtn");
    this.$resetPlayheadBtn = this.$widget.find("#resetPlayheadBtn");
    this.$tempoInput =  this.$widget.find("#tempoInput");
    this.$chooseFileBtn =  this.$widget.find("#chooseFileBtn");
    this.$fitContentBtn =  this.$widget.find("#fitContentBtn");
    this.$selectSize =  this.$widget.find("#selectSize");
    this.$selectColorMode =  this.$widget.find("#selectColorMode");
    this.$selectFilterMode =  this.$widget.find("#selectFilterMode");
    this.$selectFilterValue =  this.$widget.find("#selectFilterValue");
    this.$copyCanvasBtn =  this.$widget.find("#copyCanvasBtn");
    this.$timeSignature =  this.$widget.find("#timeSignature");
    
    this.$tempoInput.bind('change', () =>  this.$visualizer.tempo = this.$tempoInput.value);
    this.$playBtn[0].addEventListener('click', () => this.startOrStop());
    this.$resetPlayheadBtn[0].addEventListener('click', () => this.$visualizer[0].currentPlayhead = 0);
    this.$chooseFileBtn[0].onchange = (event) => this.loadFile(event);
    this.$selectSize[0].onchange = (event) => this.changeSize(event);
    this.$selectColorMode[0].onchange = (event) => this.changeColorMode(event);
    this.$selectFilterMode[0].onchange = (event) => this.changeFilterMode(event);
    this.$selectFilterValue[0].onchange = (event) => this.changeFilterValue(event);
    //document.addEventListener('click', (event) => this.loadOnClick(event));
    this.$copyCanvasBtn[0].addEventListener('click', () => this.$visualizer[0].copyCanvasToClipboard());
    this.$visualizer[0].addEventListener('playbackStopped', () => this.updateStartStopButton());
    this.$visualizer[0].addEventListener('updateTimeSignature', (event) => this.updateTimeSignature(event));
    
    const targetSizeRect = this.$visualizer[0].getBoundingClientRect();  
    
    this.$visualizer[0].widthToFit = targetSizeRect.width;
    this.$visualizer[0].heightToFit = targetSizeRect.height;
    this.$visualizer[0].addEventListener('visualizer-ready', () => 
    {
      this.$tempoInput[0].value =  this.$visualizer[0].tempo;
      this.$playBtn[0].disabled = false;
      this.$playBtn[0].textContent = 'play';
    });
    this.$fitContentBtn[0].addEventListener('click', () => this.fitContent());
    
    const optionsTemplate = "<option value=\"$$VALUE_REPLACER$$\">$$TEXT_REPLACER$$</option>";
    const valueReplacer = "$$VALUE_REPLACER$$";
    const textReplacer = "$$TEXT_REPLACER$$";
    
    if(COLOR_MODE != undefined)
    {
      const colorModeValues = Object.values(COLOR_MODE);
      const colorModeKeys = Object.keys(COLOR_MODE);
      var colorModeOptions = "";
      for(var k = 0; k < colorModeKeys.length; k++)
      {
        const optionToAdd = optionsTemplate.replace(valueReplacer, colorModeValues[k]).replace(textReplacer, colorModeKeys[k]);
        colorModeOptions = colorModeOptions + optionToAdd;
      }
      this.$selectColorMode[0].innerHTML = colorModeOptions;
    }
    else
    {
      console.log("COLOR_MODE IS INDEFINED!")
    }
    
    if(FILTER_MODE != undefined)
    {
      const filterModeValues = Object.values(FILTER_MODE);
      const filterModeKeys = Object.keys(FILTER_MODE);
      var filterModeOptions = "";
      for(k = 0; k < filterModeKeys.length; k++)
      {
          const optionToAdd = optionsTemplate.replace(valueReplacer, filterModeValues[k]).replace(textReplacer, filterModeKeys[k]);
          filterModeOptions = filterModeOptions + optionToAdd;
      }
      this.$selectFilterMode[0].innerHTML = filterModeOptions;
      console.log("FILTER: " + filterModeOptions);
    }
    else
    {
      console.log("FILTER_MODE IS INDEFINED!")
    }
    
    if(FILTER_VALUE != undefined)
    {
      const filterValues = Object.values(FILTER_VALUE);
      const filterKeys = Object.keys(FILTER_VALUE);
      var filterValueOptions = "";
      for(k = 0; k < filterKeys.length; k++)
      {
          const optionToAdd = optionsTemplate.replace(valueReplacer, filterValues[k]).replace(textReplacer, filterKeys[k]);
          filterValueOptions = filterValueOptions + optionToAdd;
      }
      this.$selectFilterValue[0].innerHTML = filterValueOptions;
    }
    else
    {
      console.log("FILTER_VALUE IS INDEFINED!")
    }

    this.$visualizer[0].pixelsPerTimeStep =  this.$visualizer[0].maxPixelsPerTimeStep * (30 / 1000);
    this._visualizerRelativeHeight = 30;
    this.$visualizer[0]._widthToFit = window.innerWidth;
    this.$visualizer[0]._heightToFit = Math.round(this._visualizerRelativeHeight / 100.0 *  window.innerHeight);
    this.changeSizeByPercents(this._visualizerRelativeHeight);
    
  }

  //not implemented correctly
  loadOnClick(event)
  {
    if (event.detail === 2)
    {	
      //alert('double click! ' + Object.keys(event.target));
      console.log('double click! ' + Object.keys(event));
      //const selection = editor.getSelection().getSelectedText();
      //console.log("SELECTED TEXT: " + selection);
      console.log('double click! ' + Object.values(event));
      if(event.target.parentElement.className.includes("ck-button_with-text"))
      {
          //openPath(event.target.innerText);
      }
    }
  }
  
  loadFile(event) 
  {
    const file = event.target.files[0];
    this.$visualizer[0].loadFile(file);
    //.then(this.$visualizer[0].changeSize(Math.round(this._visualizerRelativeHeight / 100.0 *  window.innerHeight)));
    console.log("loading file!");
  }
  
  changeSize(event) 
  {
    const value = event.target.value;
    this._visualizerRelativeHeight = value;
    this.$visualizer[0].changeSize(Math.round(value / 100.0 *  window.innerHeight));
  }
  
  changeSizeByPercents(percents) 
  {
    const value = percents;
    this._visualizerRelativeHeight = value;
    this.$visualizer[0].changeSize(Math.round(value / 100.0 *  window.innerHeight));
  }
  
  changeColorMode(event) 
  {
    this.$visualizer[0].colorMode = Number(event.target.value);
  }
  
  changeFilterMode(event) 
  {
    this.$visualizer[0].filterMode = Number(event.target.value);
  }
  
  changeFilterValue(event) 
  {
    this.$visualizer[0].filterValue = Number(event.target.value);
  }
  
  startOrStop() 
  {
    if (this.$visualizer[0].isPlaying()) 
    {
      this.$visualizer[0].stop();
      this.$playBtn[0].textContent = 'play';
    } 
    else 
    {
      this.$visualizer[0].tempo = this.$tempoInput[0].value;
      this.$visualizer[0].start();
      this.$playBtn[0].textContent = 'stop';
    }
  }

  updateStartStopButton()
  {
    if (this.$visualizer[0].isPlaying()) 
      this.$playBtn[0].textContent = 'stop';
    else 
      this.$playBtn[0].textContent = 'play';
  }
  
  fitContent()
  {
    this.$visualizer[0].fitContent(this.$visualizer[0].clientWidth, this.$visualizer[0].clientHeight);
  }

  updateTimeSignature(event)
  {    
    this.$timeSignature[0].innerHTML = event.detail.numerator + "/" + event.detail.denominator;
  }

}

new MainControls();

