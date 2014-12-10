//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  // Audio Context shim stuff
  var AudioContext = root.webkitAudioContext || root.AudioContext;
  if (!AudioContext) {
    throw new Error("No Web Audio API support - cannot initialize Rhombus.");
  }

  // Add Rhombus constructor
  root.Rhombus = function() {

    var ctx = new AudioContext();
    Object.defineProperty(this, '_ctx', {
      value: ctx
    });

    var curId = 0;
    this._setId = function(t, id) {
      if (id >= curId) {
        curId = id + 1;
      }

      Object.defineProperty(t, 'id', {
        value: id,
        enumerable: true
      });
    };

    this._newId = function(t) {
      this._setId(t, curId);
      curId++;
    };

    root.Rhombus._graphSetup(this);
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._songSetup(this);
    root.Rhombus._timeSetup(this);
  };

})(this);

//! rhombus.util.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus.Util = {};

  // Converts a note-number (typical range 0-127) into a frequency value
  // We'll probably just want to pre-compute a table...
  Rhombus.Util.noteNum2Freq = function (noteNum) {
    var freq =  Math.pow(2, (noteNum-69)/12) * 440;
    return freq;
  }

})(this.Rhombus);

//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._graphSetup = function(r) {
    // Set up the audio graph
    // Hardcoded effect for now
    var graph = {};

    var enabled = false;
    r.getEffectEnabled = function() {
      return enabled;
    };

    var inGain = r._ctx.createGain();
    var delay = r._ctx.createDelay();
    delay.delayTime.value = 3/8;

    var feedbackGain = r._ctx.createGain();
    feedbackGain.gain.value = 0.4;

    var masterOutGain = r._ctx.createGain();
    r.getMasterGain = function() {
      return masterOutGain.gain.value;
    };
    r.setMasterGain = function(gain) {
      masterOutGain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // controls the amount of dry signal going to the output
    var dryGain = r._ctx.createGain();
    dryGain.gain.value = 1.0;

    // controls the how much of the input is fed to the delay
    // currently used to toggle the effect on or off
    var preGain = r._ctx.createGain();

    // controls the amount of wet signal going to the output
    var wetGain = r._ctx.createGain();
    wetGain.gain.value = 0.0;

    r.getWetGain = function () {
      return wetGain.gain.value;;
    };
    r.setWetGain = function(gain) {
      wetGain.gain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // this controls the feedback amount
    r.getFeedbackGain = function () {
      return feedbackGain.gain.value;
    };
    r.setFeedbackGain = function(gain) {
      feedbackGain.gain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // direct signal control
    inGain.connect(dryGain);
    dryGain.connect(masterOutGain);

    // shut of input to the delay when the effect is disabled
    inGain.connect(preGain);

    // feedback control
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);

    // effect level control
    preGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(masterOutGain);

    masterOutGain.connect(r._ctx.destination);

    graph.mainout = inGain;
    r._graph = graph;

    var on = false;
    r.isEffectOn = function() {
      return on;
    };

    r.setEffectOn = function(enable) {
      if (enable) {
        enabled = true;
        preGain.gain.linearRampToValueAtTime(1.0, r._ctx.currentTime + 0.1);
      } else {
        enabled = false;
        preGain.gain.linearRampToValueAtTime(0.0, r._ctx.currentTime + 0.1);
      }
    };

    // disable effect by default
    r.setEffectOn(false);
  };
})(this.Rhombus);

//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {
    // A simple instrument to test basic note playback
    // Voice Structure: osc. --> gain --> filter --> gain --> output
    function Trigger(pitch) {
      this._pitch = pitch;

      // Instantiate the modules for this note trigger
      this._osc = r._ctx.createOscillator();
      this._oscGain = r._ctx.createGain();
      this._filter = r._ctx.createBiquadFilter();
      this._filterGain = r._ctx.createGain();

      // Initialize the synth voice
      this._osc.type = "square";
      this._oscGain.gain.value = 0.0;
      this._filter.type = "lowpass";
      this._filter.frequency.value = 0;

      // Make the audio graph connections
      this._osc.connect(this._oscGain);
      this._oscGain.connect(this._filter);
      this._filter.connect(this._filterGain);
      this._filterGain.connect(r._graph.mainout);

      // Attenuate the output from the filter
      this._filterGain.gain.value = 0.5;
    }

    Trigger.prototype = {
      noteOn: function(delay) {
        var start = r._ctx.currentTime + delay;
        var noteFreq = Rhombus.Util.noteNum2Freq(this._pitch);

        // Immediately set the frequency of the oscillator based on the note
        this._osc.frequency.setValueAtTime(noteFreq, r._ctx.currentTime);
        this._osc.start(start);

        // Reduce resonance for higher notes to reduce clipping
        this._filter.Q.value = 3 + (1 - this._pitch / 127) * 9;

        // Produce a smoothly-decaying volume envelope
        this._oscGain.gain.linearRampToValueAtTime(0.6, start + 0.005);
        this._oscGain.gain.linearRampToValueAtTime(0.4, start + 0.010);

        // Sweep the cutoff frequency for spaced-out envelope effects!
        this._filter.frequency.linearRampToValueAtTime(4000, start + 0.005);
        this._filter.frequency.exponentialRampToValueAtTime(200, start + 0.250);
      },

      noteOff: function(delay, pitch) {
        // just a hack for now
        if (!pitch || pitch === this._pitch) {
          var stop = r._ctx.currentTime + 0.125 + delay;
          this._oscGain.gain.linearRampToValueAtTime(0.0, stop);
          this._osc.stop(stop);
          return true;
        } else {
          return false;
        }
      }
    };

    function Instrument() {
      this._triggers = new Array();
    }

    Instrument.prototype = {
      // Play back a simple synth voice at the pitch specified by the input note
      noteOn: function(pitch, delay) {

        // Don't play out-of-range notes
        if (pitch < 0 || pitch > 127)
          return;

        var trigger = new Trigger(pitch);
        trigger.noteOn(delay);
        this._triggers.push(trigger);
      },

      // Stop the playback of the currently-sounding note
      noteOff: function(pitch, delay) {
        var newTriggers = [];
        for (var i = 0; i < this._triggers.length; i++) {
          if (!this._triggers[i].noteOff(delay, pitch)) {
            newTriggers.push(this._triggers[i]);
          }
        }
        this._triggers = newTriggers;
      },

      killAllNotes: function() {
        for (var i = 0; i < this._triggers.length; i++) {
          this._triggers[i].noteOff(0);
        }
        this._triggers = [];
      }
    };

    // I'm not quite sure how to "install" the default instrument...
    var inst1 = new Instrument();
    r.Instrument = inst1;

    r.startPreviewNote = function(pitch) {
      r.Instrument.noteOn(pitch, 0);
    };

    r.stopPreviewNote = function(pitch) {
      r.Instrument.noteOff(pitch, 0);
    };
  };
})(this.Rhombus);

//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {
    r.Note = function(pitch, start, length, id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }
      this._pitch = pitch || 60;
      this._start = start || 0;
      this._length = length || 0;
    };

    r.Note.prototype = {
      getPitch: function() {
        return this._pitch;
      },

      setPitch: function(pitch) {
        // TODO: impl
      },

      getStart: function() {
        return this._start;
      },

      setStart: function (start) {
        // TODO: impl
      },

      getLength: function() {
        return this._length;
      },

      setLength: function(length) {
        // TODO: impl
      },

      delete: function(length) {
        // TODO: impl
      }
    };

    var song;
    function newSong() {
      r._song = {};
      song = r._song;
      song.notes = new Array();
      song.notesMap = {};
    }

    newSong();

    r.getNoteCount = function() {
      return song.notes.length;
    };

    r.getNote = function(index) {
      return song.notes[index];
    };

    r.insertNote = function(note) {
      song.notesMap[note.id] = note;
      song.notes.push(note);
    };

    r.getSongLengthSeconds = function() {
      var lastNote = song.notes[r.getNoteCount() - 1];
      return r.ticks2Seconds(lastNote.getStart() + lastNote.getLength());
    };

    r.importSong = function(json) {
      newSong();
      var notes = JSON.parse(json).notes;
      for (var i = 0; i < notes.length; i++) {
        r.insertNote(new r.Note(notes[i]._pitch, notes[i]._start, notes[i]._length, notes[i].id));
      }
    }

    r.exportSong = function() {
      return JSON.stringify(song);
    };

    var interval = 240;
    var last = 960 - interval;

    function appendArp(p1, p2, p3) {
      var startTime = last + interval;
      last += interval*4;

      r.insertNote(new r.Note(p1, startTime, interval*2));
      r.insertNote(new r.Note(p2, startTime + interval, interval*2));
      r.insertNote(new r.Note(p3, startTime + interval*2, interval*2));
      r.insertNote(new r.Note(p2, startTime + interval*3, interval*2));
    }

    appendArp(60, 63, 67);
    appendArp(60, 63, 67);
    appendArp(60, 63, 68);
    appendArp(60, 63, 68);
    appendArp(60, 63, 67);
    appendArp(60, 63, 67);
    appendArp(59, 62, 67);
    appendArp(59, 62, 67);
  };
})(this.Rhombus);

//! rhombus.time.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._timeSetup = function(r) {
    function createScheduleWorker() {
      var code =
      "var scheduleId = false;\n" +
      "self.onmessage = function(oEvent) {\n" +
      "  if (oEvent.data.playing === false) {\n" +
      "    if (scheduleId) {\n" +
      "      clearTimeout(scheduleId);\n" +
      "    }\n" +
      "  } else {\n" +
      "    triggerSchedule();\n" +
      "  }\n" +
      "}\n" +
      "function triggerSchedule() {\n" +
      "  postMessage(0);\n" +
      "  scheduleId = setTimeout(triggerSchedule, 10);\n" +
      "}\n";
      var blob = new Blob([code], {type: "application/javascript"});
      return new Worker(URL.createObjectURL(blob));
    }

    var scheduleWorker = createScheduleWorker();
    scheduleWorker.onmessage = scheduleNotes;

    // Number of ms to schedule ahead
    var scheduleAhead = 50;

    var lastScheduled = 0;
    function scheduleNotes() {
      var notes = r._song.notes;

      var nowTicks = r.seconds2Ticks(r.getPosition());

      // determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled && (r.getLoopEnd() - nowTicks < scheduleAhead);

      // need to do this more cleanly -- maybe a single branch
      var scheduleStart = (doWrap) ? r.getLoopEnd() : lastScheduled;
      var scheduleEnd   = (doWrap) ? r.getLoopEnd() : nowTicks + scheduleAhead;
      var scheduleTo    = (doWrap) ? r.getLoopEnd() : nowTicks + scheduleAhead;

      var count = 0;
      // May want to avoid iterating over all the notes every time
      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var start = note.getStart();
        var end = start + note.getLength();

        if (start > scheduleStart && start < scheduleEnd) {
          var delay = r.ticks2Seconds(start) - r.getPosition();
          r.Instrument.noteOn(note.getPitch(), delay);
          count += 1;
        }

        if (end > scheduleStart) {
          var delay = r.ticks2Seconds(end) - r.getPosition();
          r.Instrument.noteOff(note.getPitch(), delay);
          count += 1;
        }
      }

      lastScheduled = scheduleTo;

      //if (count > 0) {
      //  console.log("scheduled (" + scheduleStart + ", " + scheduleEnd + "): " + count + " events");
      //}
      
      // TODO: adjust scheduleStart/End/To to handle wraparound correctly
      if (doWrap)
        r.loopPlayback(nowTicks);
    }

    /////////////////////////////////////////////////////////////////////////////
    // Playback/timebase stuff
    /////////////////////////////////////////////////////////////////////////////

    // The smallest unit of time in Rhombus is one tick
    var TICKS_PER_SECOND = 480;

    function ticks2Beats(ticks) {
      return ticks / TICKS_PER_SECOND;
    }

    function beats2Ticks(beats) {
      return beats * TICKS_PER_SECOND;
    }

    // This is fixed for now...
    var BPM = 120;

    r.ticks2Seconds = function(ticks) {
      return ticks2Beats(ticks) / BPM * 60;
    }

    r.seconds2Ticks = function(seconds) {
      var beats = seconds / 60 * BPM;
      return beats2Ticks(beats);
    }

    var playing = false;
    var time = 0;

    // loop start and end position in ticks
    var loopStart   = 960;
    var loopEnd     = 4800 - 1;
    var loopEnabled = false;

    function resetPlayback() {
      lastScheduled = 0;
      r.Instrument.killAllNotes();
    }

    r.startPlayback = function() {
      if (playing) {
        return;
      }

      playing = true;
      time = time - r._ctx.currentTime;
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!playing) {
        return;
      }

      resetPlayback();

      playing = false;
      time = getPosition(true);
      scheduleWorker.postMessage({ playing: false });
    };

    r.loopPlayback = function (nowTicks) {
      // do loop stuff
      var tickDiff = nowTicks - loopEnd;
      if (tickDiff >= 0 && loopEnabled === true) {
        console.log("Overshot loopEnd by " + tickDiff.toFixed(3) + " ticks @ " + 
                    r._ctx.currentTime.toFixed(3));
        r.moveToPositionTicks(loopStart + tickDiff);
        scheduleNotes();
      }
    };

    function getPosition(playing) {
      if (playing) {
        return r._ctx.currentTime + time;
      } else {
        return time;
      }
    }

    r.getPosition = function() {
      return getPosition(playing);
    };

    r.moveToPositionTicks = function(ticks) {
      var seconds = r.ticks2Seconds(ticks);
      r.moveToPositionSeconds(seconds);
    };

    r.moveToPositionSeconds = function(seconds) {
      if (playing) {
        resetPlayback();
        time = seconds - r._ctx.currentTime;
      } else {
        time = seconds;
      };
    };

    r.getLoopEnabled = function() {
      return loopEnabled;
    };

    r.setLoopEnabled = function(enabled) {
      loopEnabled = enabled;
    };

    r.getLoopStart = function() {
      return loopStart;
    };

    r.setLoopStart = function(ticks) {
      loopStart = ticks;
    };

    r.getLoopEnd = function() {
      return loopEnd;
    };

    r.setLoopEnd = function(ticks) {
      loopEnd = ticks;
    };
  };
})(this.Rhombus);
