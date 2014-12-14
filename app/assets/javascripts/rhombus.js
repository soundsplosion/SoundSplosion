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
    };

    root.Rhombus._graphSetup(this);
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._songSetup(this);
    root.Rhombus._timeSetup(this);
    root.Rhombus._editSetup(this);
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
      masterOutGain.gain.linearRampToValueAtTime(gain, r._ctx.currentTime + 0.1);
    };

    // controls the amount of dry signal going to the output
    var dryGain = r._ctx.createGain();
    dryGain.gain.value = 1.0;

    // controls the how much of the input is fed to the delay
    // currently used to toggle the effect on or off
    var preGain = r._ctx.createGain();

    // controls the amount of wet signal going to the output
    var wetGain = r._ctx.createGain();
    wetGain.gain.value = 0.4;

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
    function Trigger(id, pitch) {
      this._pitch = pitch;
      this._id = id;

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

    // default envelope parameters for synth voice
    var peakLevel    = 0.4;
    var sustainLevel = 0.200;
    var releaseTime  = 0.250;
    var filterCutoff = 24.0;
    var filterRes    = 6;
    var envDepth     = 3.0;
    var attackTime   = 0.025;
    var decayTime    = 0.250;

    r.setReleaseTime = function(time) {
      if (time >= 0.0)
        releaseTime = time;
    };

    r.getReleaseTime = function() {
      return releaseTime;
    };

    r.setFilterCutoff = function(cutoff) {
      if (cutoff >= 0 && cutoff <= 127)
        filterCutoff = cutoff;
    };

    r.getFilterCutoff = function() {
      return filterCutoff;
    };

    r.setFilterRes = function(resonance) {
      if (resonance >= 0 && resonance <= 24)
        filterRes = resonance;
    };

    r.getFilterRes = function() {
      return filterRes;
    };

    r.setEnvDepth = function(depth) {
      if (depth >= 0.0 && depth <= 19)
        envDepth = depth + 1;
    };

    r.getEnvDepth = function() {
      return envDepth;
    };

    r.setAttackTime = function(attack) {
      if (attack >= 0.0)
        attackTime = attack;
    };

    r.getAttackTime = function() {
      return attackTime;
    };

    r.setDecayTime = function(decay) {
      if (decay >= 0.0)
        decayTime = decay;
    };

    r.getDecayTime = function() {
      return decayTime;
    };

    Trigger.prototype = {
      noteOn: function(delay) {
        var start = r._ctx.currentTime + delay;
        var noteFreq = Rhombus.Util.noteNum2Freq(+this._pitch);
        var filterFreq = Rhombus.Util.noteNum2Freq(+this._pitch + filterCutoff);

        // Immediately set the frequency of the oscillator based on the note
        this._osc.frequency.setValueAtTime(noteFreq, r._ctx.currentTime);
        this._osc.start(start);

        // Reduce resonance for higher notes to reduce clipping
        this._filter.Q.value = (1 - this._pitch / 127) * filterRes;

        // Produce a smoothly-decaying volume envelope
        this._oscGain.gain.setValueAtTime(0.0, start);
        this._oscGain.gain.linearRampToValueAtTime(peakLevel, start + 0.005);
        this._oscGain.gain.linearRampToValueAtTime(sustainLevel, start + 0.050);

        // Sweep the cutoff frequency for spaced-out envelope effects!
        this._filter.frequency.setValueAtTime(filterFreq, start);
        this._filter.frequency.exponentialRampToValueAtTime(filterFreq * envDepth, start + attackTime + 0.005);
        this._filter.frequency.exponentialRampToValueAtTime(filterFreq, start + decayTime + attackTime);
      },

      noteOff: function(delay, id) {
        if (id && id !== this._id) {
          return false;
        }

        var stop = r._ctx.currentTime + delay;

        this._oscGain.gain.cancelScheduledValues(stop);
        this._oscGain.gain.setValueAtTime(sustainLevel, stop);
        this._oscGain.gain.linearRampToValueAtTime(0.0, stop + releaseTime);
        this._osc.stop(stop + releaseTime + 0.125);

        return true;
      }
    };

    function Instrument() {
      this._triggers = new Array();
    }

    Instrument.prototype = {
      // Play back a simple synth voice at the pitch specified by the input note
      noteOn: function(id, pitch, delay) {

        // Don't play out-of-range notes
        if (pitch < 0 || pitch > 127) {
          return;
        }

        var trigger = new Trigger(id, pitch);
        trigger.noteOn(delay);
        this._triggers.push(trigger);
      },

      // Stop the playback of the currently-sounding note
      noteOff: function(id, delay) {
        var newTriggers = [];
        for (var i = 0; i < this._triggers.length; i++) {
          if (!this._triggers[i].noteOff(delay, id)) {
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

    var inst1 = new Instrument();
    r.Instrument = inst1;

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.startPreviewNote = function(pitch) {
      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r.Instrument.noteOn(previewNote.id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      if (previewNote !== undefined) {
        r.Instrument.noteOff(previewNote.id, 0);
        previewNote = undefined;
      }
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

      getStart: function() {
        return this._start;
      },

      getLength: function() {
        return this._length;
      },

      getEnd: function() {
        return this._start + this._length;
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

    r.getSongLengthSeconds = function() {
      var lastNote = song.notes[r.getNoteCount() - 1];
      return r.ticks2Seconds(lastNote.getStart() + lastNote.getLength());
    };

    r.importSong = function(json) {
      newSong();
      var notes = JSON.parse(json).notes;
      for (var i = 0; i < notes.length; i++) {
        r.Edit.insertNote(new r.Note(notes[i]._pitch, notes[i]._start, notes[i]._length, notes[i].id));
      }
    }

    r.exportSong = function() {
      return JSON.stringify(song);
    };

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

    // Number of seconds to schedule ahead
    var scheduleAhead = 0.030;

    var lastScheduled = -1;
    function scheduleNotes() {
      var notes = r._song.notes;

      var nowTicks = r.seconds2Ticks(r.getPosition());
      var aheadTicks = r.seconds2Ticks(scheduleAhead);

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      // May want to avoid iterating over all the notes every time
      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        var start = note.getStart();
        var end = note.getEnd();

        if (start >= scheduleStart && start < scheduleEnd) {
          var delay = r.ticks2Seconds(start) - r.getPosition();
          r.Instrument.noteOn(note.id, note.getPitch(), delay);
        }

        if (end >= scheduleStart && end < scheduleEnd) {
          var delay = r.ticks2Seconds(end) - r.getPosition();
          r.Instrument.noteOff(note.id, delay);
        }
      }

      lastScheduled = scheduleEnd;

      if (doWrap) {
        r.loopPlayback(nowTicks);
      }
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

    // Loop start and end position in ticks, default is two measures
    var loopStart   = 0;
    var loopEnd     = 3840;
    var loopEnabled = false;

    function resetPlayback() {
      lastScheduled = -1;
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
      var tickDiff = nowTicks - loopEnd;
      if (tickDiff >= 0 && loopEnabled === true) {
        r.moveToPositionTicks(loopStart + tickDiff);
        lastScheduled = loopStart - tickDiff;
        scheduleNotes(tickDiff);
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

    r.isPlaying = function() {
      return playing;
    };
  };
})(this.Rhombus);

//! rhombus.edit.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._editSetup = function(r) {
    r.Edit = {};

    function stopIfPlaying(note) {
      var curTicks = r.seconds2Ticks(r.getPosition());
      var playing = note.getStart() <= curTicks && curTicks <= note.getEnd();
      if (playing) {
        r.Instrument.noteOff(note.id, 0);
      }
    }

    r.Edit.insertNote = function(note) {
      r._song.notesMap[note.id] = note;
      r._song.notes.push(note);
    };


    r.Edit.changeNoteTime = function(noteid, start, length) {
      var note = r._song.notesMap[noteid];

      var shouldBePlaying = start <= curTicks && curTicks <= (start + length);

      if (!shouldBePlaying) {
        stopIfPlaying(note);
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteid, pitch) {
      var note = r._song.notesMap[noteid];

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.noteOff(note.id, 0);
      note._pitch = pitch;
    };

    r.Edit.deleteNote = function(noteid) {
      var note = r._song.notesMap[noteid];

      delete r._song.notesMap[note.id];

      var notes = r._song.notes;
      for (var i = 0; i < notes.length; i++) {
        if (notes[i].id === note.id) {
          notes.splice(i, 1);
          stopIfPlaying(note);
          return;
        }
      }
    };

  };
})(this.Rhombus);
