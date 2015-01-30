//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(root) {

  var rhombs = [];

  // Add Rhombus constructor
  root.Rhombus = function() {

    rhombs.push(this);

    this._active = true;
    this._disposed = false;
    this._ctx = Tone.context;

    this.setActive = function(active) {
      if (this._disposed) {
        return;
      }
      this._active = active;
    };

    this.dispose = function() {
      this.setActive(false);
      this._disposed = true;
      delete this._ctx;
      for (var i = 0; i < rhombs.length; i++) {
        if (rhombs[i] === this) {
          rhombs.splice(i, 1);
          return;
        }
      }
    };

    var curId = 0;
    this._setId = function(t, id) {
      if (id >= curId) {
        curId = id + 1;
      }

      Object.defineProperty(t, '_id', {
        value: id,
        enumerable: true
      });
    };

    this._newId = function(t) {
      this._setId(t, curId);
    };

    root.Rhombus._graphSetup(this);
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._patternSetup(this);
    root.Rhombus._trackSetup(this);
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

  function calculator(noteNum) {
    return Math.pow(2, (noteNum-69)/12) * 440;
  }

  var table = [];
  for (var i = 0; i < 127; i++) {
    table[i] = calculator(i);
  }

  // Converts a note-number (typical range 0-127) into a frequency value
  Rhombus.Util.noteNum2Freq = function(noteNum) {
    return table[noteNum];
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

    function Instrument() {
      Tone.PolySynth.call(this, 6, Tone.MonoSynth);
      this.toMaster();
      this._triggered = {};
    }

    Tone.extend(Instrument, Tone.PolySynth);

    Instrument.prototype.triggerAttack = function(id, pitch, delay) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay);
      } else {
        tA.call(this, freq);
      }
    };

    Instrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
    };

    Instrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    var inst1 = new Instrument();
    r.Instrument = inst1;

    // tame the beast
    r.Instrument.setVolume(-24);

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.setFilterCutoff = function(cutoff) {
      //if (cutoff >= 0 && cutoff <= 127)
      //  filterCutoff = cutoff;
      console.log(" - trying to set filter cutoff to " + cutoff);
    };

    r.startPreviewNote = function(pitch) {
      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r.Instrument.triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      if (previewNote !== undefined) {
        r.Instrument.triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);

//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {

    r.Pattern = function(id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // pattern metadata
      this._name = "Default Pattern Name";

      // pattern structure data
      this._noteMap = {};

      // TODO: determine if length should be defined here,
      // or in Track....
    };

    r.Pattern.prototype = {
      addNote: function(note) {
        this._noteMap[note._id] = note;
      }
    };

    // TODO: Note should probaly have its own source file
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
  };
})(this.Rhombus);

//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._trackSetup = function(r) {

    r.PlaylistItem = function(ptnId, start, end) {
      r._newId(this);
      this._ptnId = ptnId;
      this._start = start;
      this._end = end;
    };

    r.Track = function(id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // track metadata
      this._name = "Default Track Name";

      // track structure data
      this._targets = {};
      this._playingNotes = {};

      // TODO: define some kind of pattern playlist
      this._playlist = {};
    };

    r.Track.prototype = {

      // Determine if a playlist item exists that overlaps with the given range
      checkOverlap: function(start, end) {
        for (var id in this._playlist) {
          var item = this._playlist[id];

          if (item._start <= start && item._end > start)
            return true;

          if (item._end > start && item._end < end)
            return true;

          if (item._start <= start && item._end >= end)
            return true;

          if (start <= item._start && end >= item._end)
            return true;
        }

        // No overlapping items found
        return false;
      },

      addToPlaylist: function(ptnId, start, end) {
        // ptnId myst belong to an existing pattern
        if (r._song._patterns[ptnId] === undefined)
          return undefined;

        // All arguments must be defined
        if (ptnId === undefined || start === undefined || end === undefined)
          return undefined;

        // Minimum item length is 480 ticks (1 beat)
        if ((end - start) < 480)
          return undefined;

        // Don't allow overlapping patterns
        if (this.checkOverlap(start, end))
          return undefined;

        var newItem = new r.PlaylistItem(ptnId, start, end);
        this._playlist[newItem._id] = newItem;
        return newItem._id;
      },

      removeFromPlaylist: function(itemId) {
        if (!this._playlist.hasOwnProperty(itemId.toString()))
          return undefined;
        else
          delete this._playlist[itemId.toString()];

        return itemId;
      }
    };
  };
})(this.Rhombus);

//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._songSetup = function(r) {

    Song = function() {
      // song metadata
      this._title  = "Default Song Title";
      this._artist = "Default Song Artist";
      this._length = 1920; // not really metadata, but it's fixed for now..

      // song structure data
      this._tracks = {};
      this._patterns = {};
      this._instruments = {};
    };

    Song.prototype = {
      setTitle: function(title) {
        this._title = title;
      },

      getTitle: function() {
        return this._title;
      },

      setArtist: function(artist) {
        this._artist = artist;
      },

      getArtist: function() {
        return this._artist;
      },

      addPattern: function(pattern) {
        if (pattern === undefined) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;
        return pattern._id;
      },

      addTrack: function() {
        var track = new r.Track();
        this._tracks[track._id] = track;
        return track._id;
      }
    };

    r._song = new Song();

    r.getSongLengthSeconds = function() {
      return r.ticks2Seconds(r._song._length);
    };

    // TODO: refactor to handle multiple tracks, patterns, etc.
    //       patterns, etc., need to be defined first, of course...
    r.importSong = function(json) {
      r._song = new Song();
      r._song.setTitle(JSON.parse(json)._title);
      r._song.setArtist(JSON.parse(json)._artist);

      var tracks      = JSON.parse(json)._tracks;
      var patterns    = JSON.parse(json)._patterns;
      var instruments = JSON.parse(json)._instruments;

      // there has got to be a better way to deserialize things...
      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new r.Pattern();

        newPattern._name = pattern._name;
        newPattern._id   = pattern._id;

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new r.Note(noteMap[noteId]._pitch,
                                noteMap[noteId]._start,
                                noteMap[noteId]._length,
                                noteId);

          newPattern._noteMap[noteId] = note;
        }

        r._song._patterns[ptnId] = newPattern;
      }

      // TODO: tracks and instruments will need to be imported
      //       in a similar manner
    }

    r.exportSong = function() {
      return JSON.stringify(r._song);
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
    var scheduleAhead = 0.050;
    var lastScheduled = -1;

    // TODO: scheduling needs to happen relative to that start time of the
    // pattern
    function scheduleNotes() {
      var nowTicks = r.seconds2Ticks(r.getPosition());
      var aheadTicks = r.seconds2Ticks(scheduleAhead);

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      // Iterate over every track to find notes that can be scheduled
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        // TODO: Find a way to determine which patterns are really schedulable,
        //       based on the current playback position
        for (var playlistId in track._playlist) {
          var ptnId   = track._playlist[playlistId]._ptnId;
          var noteMap = r._song._patterns[ptnId]._noteMap;

          // TODO: Handle note start and end times relative to the start of
          //       the originating pattern

          // TODO: find a more efficient way to determine which notes to play
          if (r.isPlaying()) {
            for (var noteId in noteMap) {
              var note = noteMap[noteId];
              var start = note.getStart();

              if (start >= scheduleStart && start < scheduleEnd) {
                var delay = r.ticks2Seconds(start) - r.getPosition();
                r.Instrument.triggerAttack(note._id, note.getPitch(), delay);
                playingNotes[note._id] = note;
              }
            }
          }
        }

        // Schedule note-offs for notes playing on the current track
        for (var noteId in playingNotes) {
          var note = playingNotes[noteId];
          var end = note.getEnd();

          if (end >= scheduleStart && end < scheduleEnd) {
            var delay = r.ticks2Seconds(end) - r.getPosition();
            r.Instrument.triggerRelease(note._id, delay);
            delete playingNotes[noteId];
          }
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

    // The smallest unit of musical time in Rhombus is one tick, and there are
    // 480 ticks per quarter note
    var TICKS_PER_SECOND = 480;

    function ticks2Beats(ticks) {
      return ticks / TICKS_PER_SECOND;
    }

    function beats2Ticks(beats) {
      return beats * TICKS_PER_SECOND;
    }

    // TODO: implement variable BPM
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

    // Loop start and end position in ticks, default is one measure
    var loopStart   = 0;
    var loopEnd     = 1920;
    var loopEnabled = false;

    function resetPlayback() {
      lastScheduled = -1;

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        for (var noteId in playingNotes) {
          var note = playingNotes[noteId];
          r.Instrument.triggerRelease(note._id, 0);
          delete playingNotes[noteId];
        }
      }

      r.Instrument.killAllNotes();
    }

    r.startPlayback = function() {
      if (!r._active || playing) {
        return;
      }

      playing = true;

      // TODO: song start position needs to be defined somewhere

      // Begin slightly before the start position to prevent
      // missing notes at the beginning
      r.moveToPositionSeconds(-0.010);

      // Force the first round of scheduling
      scheduleNotes();

      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!r._active || !playing) {
        return;
      }

      playing = false;

      resetPlayback();

      time = getPosition(true);
      scheduleWorker.postMessage({ playing: false });
    };

    r.loopPlayback = function (nowTicks) {
      var tickDiff = nowTicks - loopEnd;
      if (tickDiff >= 0 && loopEnabled === true) {
        // make sure the notes near the start of the loop aren't missed
        r.moveToPositionTicks(loopStart - 0.001);
        scheduleNotes();

        // adjust the playback position to help mitigate timing drift
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
        r.Instrument.triggerRelease(note._id, 0);
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r._song._patterns[ptnId]._noteMap[note._id] = note;
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      var curTicks = r.seconds2Ticks(r.getPosition());

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(noteId, 0);
          delete playingNotes[noteId];
        }
      }

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      if (pitch === note.getPitch()) {
        return;
      }

      r.Instrument.triggerRelease(note._id, 0);
      note._pitch = pitch;
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      delete r._song._patterns[ptnId]._noteMap[note._id];

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(noteId, 0);
          delete playingNotes[noteId];
        }
      }
    };

  };
})(this.Rhombus);
