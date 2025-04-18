`<midi-visualizer>`
=================

This is a web component that shows a visualization for a midi file, and can play
audio while updating the visualization. The audio playing works best with Piano midi files at the moment,
but some multi-instrument midi files will work too.

## Navigation
<img src="./.github/images/playback_and_navigation.gif" alt="demo of using the midi-visualizer (navigation)" height=500>

## Track Filtering
<img src="./.github/images/playback_and_track_filters.gif" alt="demo of using the midi-visualizer (track filtering)" height=500>

## Sample use

```html
<html>
  <head>
  <!-- Web components polyfill, so this works on all browsers -->
  <script src="https://unpkg.com/@webcomponents/webcomponentsjs@^2.0.0/webcomponents-loader.js"></script>

  <!-- Load midified version of magenta.js, which is needed by the element. Without modification track and channel filtering will not work. -->
  <script src="magentamusic.js"></script>

  <!-- Load the web component itself -->
  <script src="midi-visualizer.js"></script>
  </head>
  <body>

  <!-- Use the web component! -->
  <midi-visualizer
  id="visualizer"
  url="https://cdn.glitch.com/3312a3b4-6418-4bed-a0bd-3a0ca4dfa2fb%2Fchopin.mid?1534369337985">
  </midi-visualizer>
  </body>
</html>
```

## Configuring the visualizer

### Properties and attributes
The `<midi-visualizer>` has the following properties you can use:

-  the `tempo`, at which the player is playing the midi. You can use this either as a property in JavaScript (eg. `aVisualizer.tempo = 500`) or as attribute in HTML (eg. `<midi-visualizer tempo="200"></midi-visualizer>`)
- the `url` of a midi file to be visualized. You can use this either as a property in JavaScript (eg. `aVisualizer.url = "https://example.com/foo.mid"`) or as attribute in HTML (eg. `<midi-visualizer url="https://example.com/foo.mid"></midi-visualizer>`)
- `noteSequence`: a magenta.js `NoteSequence` object. You can only set this as a JavaScript property (eg. `aVisualizer.noteSequence = new mm.NoteSequence()`)

### Methods
The `<midi-visualizer>` has the following methods you can call:
- `start()`, to start playing the midi
- `stop()`, to stop playing the midi
- `loadFile(blob)`, to load a midi file contents. This is useful if you want to allow
the user to upload a midi, rather than pointing to a specific file url. See the demo for an example.
- `loadFileURL(url)`, to load midi file from given link.
- `fitContent(width, height)`, to try to fit every midi notes into given canvas size.


## TriliumNext Notes
Download [MIDI.zip](https://github.com/LisGlitchrain/midi-visualizer/releases/tag/v.0.8.0) archive from releases. Import MIDI.zip archive as notes, follow instructions in the MIDI/MidiPlayerWidgetTestNote note.