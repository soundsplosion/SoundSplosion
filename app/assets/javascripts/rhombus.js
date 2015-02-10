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


    // This run-time ID is used for IDs that don't need to be exported/imported
    // with the song (e.g., RtNotes)
    var rtId = 0;
    this._newRtId = function(t) {
      Object.defineProperty(t, '_id', {
        value: rtId,
        enumerable: true
      });
      rtId = rtId + 1;
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

    this.setCurId = function(id) {
      curId = id;
    };

    this.getCurId = function() {
      return curId;
    };

    root.Rhombus._graphSetup(this);
    root.Rhombus._patternSetup(this);
    root.Rhombus._trackSetup(this);
    root.Rhombus._songSetup(this);
    root.Rhombus._samplerSetup(this);
    root.Rhombus._instrumentSetup(this);
    root.Rhombus._effectSetup(this);
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

  Rhombus._map = {};

  // Common mapping styles.
  // mapIdentity: maps x to x.
  Rhombus._map.mapIdentity = function(x) {
    return x;
  }
  // mapLinear(x, y): maps [0,1] linearly to [x,y].
  Rhombus._map.mapLinear = function(x, y) {
    function mapper(t) {
      return x + t*(y-x);
    }
    return mapper;
  }
  // mapExp(x, y): maps [0,1] exponentially to [x,y].
  // x, y should both be strictly positive.
  Rhombus._map.mapExp = function(x, y) {
    var c0 = x;
    var c1 = Math.log(y / x);
    function mapper(t) {
      return c0*Math.exp(c1*t);
    }
    return mapper;
  }
  // mapLog(x, y): maps [0,1] logarithmically to [x,y].
  // Really, it maps [smallvalue, 1] logarithmically to [x,y]
  // because log functions aren't defined at 0.
  Rhombus._map.mapLog = function(x, y) {
    var threshold = 0.0001;
    var logc1, c1, c0;
    if (y === 0) {
      c1 = 1;
      c0 = x / Math.log(threshold);
    } else {
      logc1 = Math.log(threshold) / ((x/y) - 1);
      c1 = Math.exp(logc1);
      c0 = y / logc1;
    }

    function mapper(t) {
      if (t < threshold) {
        t = threshold;
      }
      return c0*Math.log(c1*t);
    }
    return mapper;
  }
  // mapDiscrete(arg1, ...): divides [0,1] into equal-sized
  // boxes, with each box mapping to an argument.
  Rhombus._map.mapDiscrete = function() {
    var maxIdx = arguments.length-1;
    var binSize = 1.0 / arguments.length;
    var args = arguments;
    function mapper(t) {
      var idx = Math.floor(t / binSize);
      if (idx >= maxIdx) {
        idx = maxIdx;
      }
      return args[idx];
    }
    return mapper;
  }

  Rhombus._map.mergeInObject = function(base, toAdd) {
    if (typeof toAdd !== "object") {
      return;
    }

    var addKeys = Object.keys(toAdd);
    for (var idx in addKeys) {
      var key = addKeys[idx];
      var value = toAdd[key];

      if (value === undefined || value === null) {
        continue;
      }

      if (key in base) {
        var oldValue = base[key];
        if (typeof oldValue === "object" && typeof value === "object") {
          Rhombus._map.mergeInObject(base[key], value);
        } else {
          base[key] = value;
        }
      } else {
        base[key] = value;
      }
    }
  }

  Rhombus._map.subtreeCount = function(obj) {
    var count = 0;
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (typeof value === "object") {
        count += Rhombus._map.subtreeCount(value);
      } else {
        count += 1;
      }
    }
    return count;
  };

  Rhombus._map.unnormalizedParams = function(params, type, unnormalizeMaps) {
    if (params === undefined || params === null ||
        typeof(params) !== "object") {
      return params;
    }

    function unnormalized(obj, thisLevelMap) {
      var returnObj = {};
      var keys = Object.keys(obj);
      for (var idx in keys) {
        var key = keys[idx];
        var value = obj[key];
        if (typeof(value) === "object") {
          var nextLevelMap = thisLevelMap[key];
          returnObj[key] = unnormalized(value, nextLevelMap);
        } else {
          var ctrXformer = thisLevelMap != undefined ? thisLevelMap[key] : undefined;
          if (ctrXformer !== undefined) {
            returnObj[key] = ctrXformer(value);
          } else {
            returnObj[key] = value;
          }
        }
      }
      return returnObj;
    }

    return unnormalized(params, unnormalizeMaps[type]);
  };

  Rhombus._map.generateSetObject = function(obj, leftToCount, paramValue) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (typeof value === "object") {
        var generated = Rhombus._map.generateSetObject(value, leftToCount, paramValue);
        if (typeof generated === "object") {
          var toRet = {};
          toRet[key] = generated;
          return toRet;
        } else {
          leftToCount = generated;
        }
      } else if (leftToCount === 0) {
        var toRet = {};
        toRet[key] = paramValue;
        return toRet;
      } else {
        leftToCount -= 1;
      }
    }
    return leftToCount;
  };

  Rhombus._map.getParameterName = function(obj, leftToCount) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (typeof value === "object") {
        var name = Rhombus._map.getParameterName(value, leftToCount);
        if (typeof name === "string") {
          return key + ":" + name;
        } else {
          leftToCount = name;
        }
      } else if (leftToCount === 0) {
        return key;
      } else {
        leftToCount -= 1;
      }
    }
    return leftToCount;
  };

  // Frequently used mappings.
  // TODO: fix envelope function mappings
  Rhombus._map.timeMapFn = Rhombus._map.mapExp(0.0001, 60);
  Rhombus._map.freqMapFn = Rhombus._map.mapExp(1, 22100);
  Rhombus._map.lowFreqMapFn = Rhombus._map.mapExp(1, 100);
  Rhombus._map.exponentMapFn = Rhombus._map.mapExp(0.01, 10);
  Rhombus._map.harmMapFn = Rhombus._map.mapLinear(-1000, 1000);

  Rhombus._map.envelopeMap = {
    "attack" : Rhombus._map.timeMapFn,
    "decay" : Rhombus._map.timeMapFn,
    "sustain" : Rhombus._map.timeMapFn,
    "release" : Rhombus._map.timeMapFn,
    "exponent" : Rhombus._map.exponentMapFn
  };

  Rhombus._map.filterMap = {
    "type" : Rhombus._map.mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                         "highshelf", "peaking", "notch", "allpass"),
    "frequency" : Rhombus._map.freqMapFn,
    "rolloff" : Rhombus._map.mapDiscrete(-12, -24, -48),
    // TODO: verify this is good
    "Q" : Rhombus._map.mapLinear(1, 15),
    // TODO: verify this is good
    "gain" : Rhombus._map.mapIdentity
  };

  Rhombus._map.filterEnvelopeMap = {
    "attack" : Rhombus._map.timeMapFn,
    "decay" : Rhombus._map.timeMapFn,
    // TODO: fix this
    "sustain" : Rhombus._map.timeMapFn,
    "release" : Rhombus._map.timeMapFn,
    "min" : Rhombus._map.freqMapFn,
    "max" : Rhombus._map.freqMapFn,
    "exponent" : Rhombus._map.exponentMapFn
  };

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

//! rhombus.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._samplerSetup = function(r) {

    function SuperToneSampler() {
      Tone.Sampler.call(this, Array.prototype.slice.call(arguments));
    }

    SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
      // Exactly as in Tone.Sampler, except add a parameter to let you control
      // sample offset.
      if (offset === undefined) {
        offset = 0;
      }

      time = this.toSeconds(time);
      note = this.defaultArg(note, 0);
      this.player.setPlaybackRate(this.intervalToFrequencyRatio(note), time);
      this.player.start(time, offset);
      this.envelope.triggerAttack(time, velocity);
      this.filterEnvelope.triggerAttack(time);
    };

    Tone.extend(SuperToneSampler, Tone.Sampler);

    function Sampler(options, id) {
      if (id === undefined || id === null) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      Tone.Instrument.call(this);

      this.names = [];
      this.samples = [];
      this._triggered = {};
      this._currentParams = {};

      if (options !== undefined) {
        var params = options.params;
        var names = options.names;
        var buffs = options.buffs;

        var setNames = names;
        var setBufs = [];
        for (var i = 0; i < buffs.length; i++) {
          var channels = buffs[i];
          var setBuf = Tone.context.createBuffer(channels.length, channels[0].length, Tone.context.sampleRate);

          for (var chI = 0; chI < channels.length; chI++) {
            var getChanData = channels[chI];
            var setChanData = setBuf.getChannelData(chI);
            for (var sI = 0; sI < getChanData.length; sI++) {
              var dat = getChanData[sI];
              if (dat === undefined) {
                dat = 0;
              }
              setChanData[sI] = dat;
            }
          }
          setBufs.push(setBuf);
        }

        this.setBuffers(setBufs, setNames);
      }
    }

    Tone.extend(Sampler, Tone.Instrument);

    Sampler.prototype.setBuffers = function(buffers, names) {
      if (buffers === undefined) {
        return;
      }

      var useDefaultNames = false;
      if (names === undefined) {
        useDefaultNames = true;
      }

      this.killAllNotes();

      this._names = [];
      this.samples = [];
      this._triggered = {};
      this._currentParams = {};

      for (var i = 0; i < buffers.length; ++i) {
        var sampler = new SuperToneSampler();
        sampler.player.setBuffer(buffers[i]);

        // TODO: proper routing
        sampler.toMaster();

        this.samples.push(sampler);
        if (useDefaultNames || names[i] === undefined) {
          this._names.push("" + i);
        } else {
          this._names.push(names[i]);
        }
      }
    };

    Sampler.prototype.triggerAttack = function(id, pitch, delay) {
      if (pitch < 0 || pitch > 127) {
        return;
      }

      var idx = Math.floor((pitch / 128) * this.samples.length);
      this._triggered[id] = idx;

      // TODO: real keyzones, pitch control, etc.
      if (delay > 0) {
        this.samples[idx].triggerAttack(0, "+" + delay);
      } else {
        this.samples[idx].triggerAttack(0);
      }
    };

    Sampler.prototype.triggerRelease = function(id, delay) {
      var idx = this._triggered[id];
      if (idx === undefined) {
        return;
      }

      if (delay > 0) {
        this.samples[idx].triggerRelease("+" + delay);
      } else {
        this.samples[idx].triggerRelease();
      }
    };

    Sampler.prototype.killAllNotes = function() {
      this.samples.forEach(function(sampler) {
        sampler.triggerRelease();
      });
      this.triggered = {};
    };

    Sampler.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Sampler.prototype.toJSON = function() {
      var buffs = [];
      for (var sampIdx = 0; sampIdx < this.samples.length; sampIdx++) {
        var channels = [];
        var audioBuf = this.samples[sampIdx].player._buffer;
        for (var chanIdx = 0; chanIdx < audioBuf.numberOfChannels; chanIdx++) {
          var chan = [];
          var audioData = audioBuf.getChannelData(chanIdx);
          for (var sIdx = 0; sIdx < audioData.length; sIdx++) {
            chan[sIdx] = audioData[sIdx];
          }
          channels.push(chan);
        }
        buffs.push(channels);
      }

      var params = {
        "params": this._currentParams,
        "names": this._names,
        "buffs": buffs
      };
      var jsonVersion = {
        "_id": this._id,
        "_type": "samp",
        "_params": params
      };
      return jsonVersion;
    };

    // The map is structured like this for the Rhombus._map.unnormalizedParams call.
    var unnormalizeMaps = {
      "samp" : {
        "player" : {
          "loop" : Rhombus._map.mapDiscrete(false, true)
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
        "filter" : Rhombus._map.filterMap
      }
    };

    function unnormalizedParams(params) {
      return Rhombus._map.unnormalizedParams(params, "samp", unnormalizeMaps);
    }

    Sampler.prototype.normalizedObjectSet = function(params) {
      this._trackParams(params);

      var samplers = Object.keys(params);
      for (var idx in samplers) {
        var samplerIdx = samplers[idx];
        var unnormalized = unnormalizedParams(params[samplerIdx]);
        this.samples[samplerIdx].set(unnormalized);
      }
    };

    Sampler.prototype.parameterCount = function() {
      return this.samples.length * Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
    };

    Sampler.prototype.parameterName = function(paramIdx) {
      var perSampler = Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
      var realParamIdx = paramIdx % perSampler;
      var sampleIdx = Math.floor(paramIdx / perSampler);

      var name = Rhombus._map.getParameterName(unnormalizedMaps["samp"], realParamIdx);
      if (typeof name !== "string") {
        return;
      }
      return this._names[sampleIdx] + ":" + name;
    };

    Sampler.prototype.normalizedSet = function(paramsIdx, paramValue) {
      var perSampler = Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
      var realParamIdx = paramIdx % perSampler;
      var sampleIdx = Math.floor(paramIdx / perSampler);

      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps["samp"], realParamIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedSetObj({ sampleIdx : setObj });
    };

    r._Sampler = Sampler;
  };
})(this.Rhombus);

//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var noise = Tone.NoiseSynth;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : mono,
      "am"   : am,
      "fm"   : fm,
      "noise": noise,
      "duo"  : duo
    };

    // TODO: put this on the Rhombus object
    function Instrument(type, options, id) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        type = "mono";
        ctr = mono;
      }

      if (id === undefined || id === null) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._currentParams = {};
      this._trackParams(options);

      var unnormalized = unnormalizedParams(options, this._type);
      Tone.PolySynth.call(this, undefined, ctr, unnormalized);

      // TODO: don't route everything to master
      this.toMaster();
      this._triggered = {};
    }
    Tone.extend(Instrument, Tone.PolySynth);

    r.addInstrument = function(type, options, id) {
      var instr;
      if (type === "samp") {
        instr = new r._Sampler(options, id);
      } else {
        instr = new Instrument(type, options, id);
      }

      if (instr === null || instr === undefined) {
        return;
      }

      r._song._instruments[instr._id] = instr;
      return instr._id;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +id;
      }
      return id;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      delete r._song._instruments[id];
    };

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

    Instrument.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Instrument.prototype.toJSON = function() {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams
      };
      return jsonVersion;
    };

    var monoSynthMap = {
      "portamento" : Rhombus._map.mapLinear(0, 10),
      // TODO: verify this is good
      "volume" : Rhombus._map.mapLog(-96.32, 0),
      "oscillator" : {
        "type" : Rhombus._map.mapDiscrete("sine", "square", "triangle", "sawtooth", "pulse", "pwm")
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.filterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "detune" : Rhombus._map.harmMapFn
    };

    var unnormalizeMaps = {
      "mono" : monoSynthMap,

      "am" : {
        "portamento" : Rhombus._map.mapLinear(0, 10),
        // TODO: verify this is good
        "volume" : Rhombus._map.mapLog(-96.32, 0),
        // TODO: verify this is good
        "harmonicity" : Rhombus._map.harmMapFn,
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "fm" : {
        "portamento" : Rhombus._map.mapLinear(0, 10),
        // TODO: verify this is good
        "volume" : Rhombus._map.mapLog(-96.32, 0),
        // TODO: verify this is good
        "harmonicity" : Rhombus._map.harmMapFn,
        // TODO: verify this is good
        "modulationIndex" : Rhombus._map.mapLinear(-5, 5),
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "portamento" : Rhombus._map.mapLinear(0, 10),
        // TODO: verify this is good
        "volume" : Rhombus._map.mapLog(-96.32, 0),
        "noise" : {
          "type" : Rhombus._map.mapDiscrete("white", "pink", "brown")
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filter" : Rhombus._map.filterMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      },

      "duo" : {
        "portamento" : Rhombus._map.mapLinear(0, 10),
        // TODO: verify this is good
        "volume" : Rhombus._map.mapLog(-96.32, 0),
        "vibratoAmount" : Rhombus._map.mapLinear(0, 20),
        "vibratoRate" : Rhombus._map.freqMapFn,
        "vibratoDelay" : Rhombus._map.timeMapFn,
        "harmonicity" : Rhombus._map.harmMapFn,
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    Instrument.prototype.normalizedObjectSet = function(params) {
      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    };

    // Parameter list interface
    Instrument.prototype.parameterCount = function() {
      return Rhombus._map.subtreeCount(unnormalizeMaps[this._type]);
    };

    Instrument.prototype.parameterName = function(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps[this._type], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    Instrument.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedObjectSet(setObj);
    };

    // HACK: these are here until proper note routing is implemented
    var samplesPerCycle = Math.floor(Tone.context.sampleRate / 440);
    var sampleCount = Tone.context.sampleRate * 2.0;
    var buffer = Tone.context.createBuffer(2, sampleCount, Tone.context.sampleRate);
    for (var i = 0; i < 2; i++) {
      var buffering = buffer.getChannelData(i);
      for (var v = 0; v < sampleCount; v++) {
        buffering[v] = (v % samplesPerCycle) / samplesPerCycle;
      }
    }
    r.buf = buffer;

    var instrId = r.addInstrument("mono");
    r.Instrument = r._song._instruments[instrId];
    r.Instrument.normalizedObjectSet({ volume: 0.1 });
    // HACK: end

    // only one preview note is allowed at a time
    var previewNote = undefined;

    r.setParameter = function(paramIdx, value) {
      
      for (var instId in r._song._instruments) {
        r._song._instruments[instId].normalizedSet(paramIdx, value);
      }
    },

    r.startPreviewNote = function(pitch) {
      var keys = Object.keys(r._song._instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote === undefined) {
        previewNote = new Note(pitch, 0);
        r._song._instruments[keys[0]].triggerAttack(previewNote._id, pitch, 0);
      }
    };

    r.stopPreviewNote = function() {
      var keys = Object.keys(r._song._instruments);
      if (keys.length === 0) {
        return;
      }

      if (previewNote !== undefined) {
        r._song._instruments[keys[0]].triggerRelease(previewNote._id, 0);
        previewNote = undefined;
      }
    };
  };
})(this.Rhombus);

//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._effectSetup = function(r) {

    var dist = Tone.Distortion;
    var typeMap = {
      // TODO: more effect types
      "dist": dist
    };

    function makeEffect(type, options, id) {
      var ctr = typeMap[type];
      if (ctr === null || ctr === undefined) {
        type = "dist";
        ctr = dist;
      }

      var unnormalized = unnormalizedParams(options, type);
      var eff = new ctr(unnormalized);
      if (id === undefined || id === null) {
        r._newId(eff);
      } else {
        r._setId(eff, id);
      }

      installFunctions(eff);
      eff._type = type;
      eff._currentParams = {};
      eff._trackParams(options);

      return eff;
    }

    function installFunctions(eff) {
      eff.normalizedObjectSet = normalizedObjectSet;
      eff.parameterCount = parameterCount;
      eff.parameterName = parameterName;
      eff.normalizedSet = normalizedSet;
      eff.toJSON = toJSON;
      eff._trackParams = trackParams;
    }

    r.addEffect = function(type, options, id) {
      var effect = makeEffect(type, options, id);

      if (effect === null || effect === undefined) {
        return;
      }

      r._song._effects[effect._id] = effect;
      return effect._id;
    }

    function inToId(effectOrId) {
      var id;
      if (typeof effectOrId === "object") {
        id = effectOrId._id;
      } else {
        id = +id;
      }
      return id;
    }

    r.removeEffect = function(effectOrId) {
      var id = inToId(effectOrId);
      if (id < 0) {
        return;
      }

      delete r._song._effects[id];
    }

    function toJSON(params) {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams
      };
      return jsonVersion;
    }

    // Parameter stuff
    var unnormalizeMaps = {
      "dist" : {
        "dry" : Rhombus._map.mapIdentity,
        "wet" : Rhombus._map.mapIdentity
      },
      // TODO: more stuff here
    };

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    function normalizedObjectSet(params) {
      this._trackParams(params);
      var unnormalized = unnormalizedParams(params, this._type);
      this.set(unnormalized);
    }

    // Parameter list interface
    function parameterCount() {
      return Rhombus._map.subtreeCount(unnormalizeMaps[this._type]);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps[this._type], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function normalizedSet(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this.normalizedObjectSet(setObj);
    }

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    }

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
      this._length = 1920;
      this._noteMap = {};
    };

    // TODO: make this interface a little more sanitary...
    //       It's a rather direct as-is
    r.Pattern.prototype = {

      getLength: function() {
        return this._length;
      },

      setLength: function(length) {
        if (length !== undefined && length >= 0)
          this._length = length;
      },

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (typeof name === 'undefined') {
          return undefined;
        }
        else {
          this._name = name.toString();
          return this._name;
        }
      },

      addNote: function(note) {
        this._noteMap[note._id] = note;
      },

      deleteNote: function(noteId) {
        var note = this._noteMap[noteId];

        if (note === undefined)
          return undefined;

        delete this._noteMap[note._id];

        return noteId;
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

    r.PlaylistItem = function(ptnId, start, length, id) {
      if (id) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._ptnId = ptnId;
      this._start = start;
      this._length = length;
    };

    r.PlaylistItem.prototype = {

      setStart: function(start) {
        if (typeof start === 'undefined') {
          return undefined;
        }

        var startVal = parseInt(start);
        if (startVal < 0) {
          return undefined;
        }

        return this._start = startVal;
      },

      getStart: function() {
        return this._start;
      },

      setLength: function(length) {
        if (typeof length === 'undefined') {
          return undefined;
        }

        var lenVal = parseInt(length);
        if (lenVal < 0) {
          return undefined;
        }

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
      }
    };

    r.RtNote = function(pitch, start, end) {
      r._newRtId(this);
      this._pitch = pitch || 60;
      this._start = start || 0;
      this._end = end || 0;
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

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (typeof name === 'undefined') {
          return undefined;
        }
        else {
          this._name = name.toString();
          return this._name;
        }
      },

      // Determine if a playlist item exists that overlaps with the given range
      checkOverlap: function(start, end) {
        for (var id in this._playlist) {
          var item = this._playlist[id];
          var itemEnd = item._start + item._length;

          if (item._start <= start && itemEnd > start)
            return true;

          if (itemEnd > start && itemEnd < end)
            return true;

          if (item._start <= start && itemEnd >= end)
            return true;

          if (start <= item._start && end >= itemEnd)
            return true;
        }

        // No overlapping items found
        return false;
      },

      addToPlaylist: function(ptnId, start, length) {

        var end = start + length;

        // ptnId myst belong to an existing pattern
        if (r._song._patterns[ptnId] === undefined)
          return undefined;

        // All arguments must be defined
        if (ptnId === undefined || start === undefined || length === undefined)
          return undefined;

        // TODO: restore these checks

        /*
        // Minimum item length is 480 ticks (1 beat)
        if (length < 480)
          return undefined;

        // Don't allow overlapping patterns
        if (this.checkOverlap(start, end))
          return undefined;
        */

        var newItem = new r.PlaylistItem(ptnId, start, length);
        this._playlist[newItem._id] = newItem;
        return newItem._id;
      },

      removeFromPlaylist: function(itemId) {
        if (!this._playlist.hasOwnProperty(itemId.toString()))
          return undefined;
        else
          delete this._playlist[itemId.toString()];

        return itemId;
      },

      toJSON: function() {
        // Don't include "_playingNotes"
        var toReturn = {};
        toReturn._id = this._id;
        toReturn._name = this._name;
        toReturn._targets = this._targets;
        toReturn._playlist = this._playlist;
        return toReturn;
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
      this._length = 1920;

      // song structure data
      this._tracks = {};
      this._patterns = {};
      this._instruments = {};
      this._effects = {};

      this._curId = 0;
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

      setLength: function(length) {
        if (length !== undefined && length >= 480) {
          this._length = length;
          return length;
        }
        else {
          return undefined;
        }
      },

      getLength: function() {
        return this._length;
      },

      addPattern: function(pattern) {
        if (pattern === undefined) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;
        return pattern._id;
      },

      deletePattern: function(ptnId) {
        var pattern = this._patterns[ptnId];

        if (typeof pattern === 'undefined') {
          return undefined;
        }

        delete this._patterns[ptnId];
        return ptnId;
      },

      addTrack: function() {
        var track = new r.Track();
        this._tracks[track._id] = track;
        return track._id;
      },

      deleteTrack: function(trkId) {
        var track = this._tracks[trkId];

        if (typeof track === 'undefined') {
          return undefined;
        }
        else {
          // TODO: find a more robust way to terminate playing notes
          for (var rtNoteId in this._playingNotes) {
            var note = this._playingNotes[rtNoteId];

            for (var instId in r._song._instruments) {
              r._song._instruments[instId].triggerRelease(rtNoteId, 0);
            }

            delete this._playingNotes[rtNoteId];
          }

          delete this._tracks[trkId];
          return trkId;
        }
      },

      // Song length here is defined as the end of the last
      // playlist item on any track
      findSongLength: function() {
        var length = 0;

        for (var trkId in this._tracks) {
          var track = this._tracks[trkId];

          for (var itemId in track._playlist) {
            var item = track._playlist[itemId];
            var itemEnd = item._start + item._length;

            if (itemEnd > length) {
              length = itemEnd;
            }
          }
        }

        return length;
      }
    };

    r._song = new Song();

    r.getSongLengthSeconds = function() {
      return r.ticks2Seconds(r._song._length);
    };

    r.importSong = function(json) {
      r._song = new Song();
      var parsed = JSON.parse(json);
      r._song.setTitle(parsed._title);
      r._song.setArtist(parsed._artist);
      r._song._length = parsed._length;

      var tracks      = parsed._tracks;
      var patterns    = parsed._patterns;
      var instruments = parsed._instruments;
      var effects     = parsed._effects;

      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new r.Pattern(pattern._id);

        newPattern._name = pattern._name;
        newPattern._length = pattern._length;

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new r.Note(noteMap[noteId]._pitch,
                                noteMap[noteId]._start,
                                noteMap[noteId]._length,
                                +noteId);

          newPattern._noteMap[+noteId] = note;
        }

        r._song._patterns[+ptnId] = newPattern;
      }

      for (var trkId in tracks) {
        var track = tracks[trkId];
        var playlist = track._playlist;

        var newTrack = new r.Track(track._id);

        newTrack._name = track._name;

        for (var itemId in playlist) {
          var item = playlist[itemId];
          var newItem = new r.PlaylistItem(item._ptnId,
                                           item._start,
                                           item._length,
                                           item._id)

          newTrack._playlist[+itemId] = newItem;
        }

        r._song._tracks[+trkId] = newTrack;
      }

      for (var instId in instruments) {
        var inst = instruments[instId];
        var instId = r.addInstrument(inst._type, inst._params, +instId);
        r._song._instruments[instId].normalizedObjectSet({ volume: 0.1 });
      }

      for (var effId in effects) {
        var eff = effects[effId];
        r.addEffect(eff._type, eff._params, +effId);
      }

      // restore curId -- this should be the last step of importing
      var curId;
      if (parsed._curId === undefined) {
        console.log("[Rhomb Import] curId not found -- beware");
      }
      else {
        r.setCurId(parsed._curId);
      }

    };

    r.exportSong = function() {
      r._song._curId = r.getCurId();
      r._song._length = r._song.findSongLength();
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
        "  scheduleId = setTimeout(triggerSchedule, 5);\n" +
        "}\n";
      var blob = new Blob([code], {type: "application/javascript"});
      return new Worker(URL.createObjectURL(blob));
    }

    var scheduleWorker = createScheduleWorker();
    scheduleWorker.onmessage = scheduleNotes;

    // Number of seconds to schedule ahead
    var scheduleAhead = 0.050;
    var lastScheduled = -1;

    function scheduleNotes() {

      // capturing the current time and position so that all scheduling actions
      // in this time frame are on the same "page," so to speak
      var curTime = r.getElapsedTime();
      var curPos = r.getPosition();
      var nowTicks = r.seconds2Ticks(curPos);
      var aheadTicks = r.seconds2Ticks(scheduleAhead);

      // Determine if playback needs to loop around in this time window
      var doWrap = r.getLoopEnabled() && (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;

      // TODO: decide to use the elapsed time since playback started,
      //       or the context time
      var scheduleEndTime = curTime + scheduleAhead;

      // Iterate over every track to find notes that can be scheduled
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        // Schedule note-offs for notes playing on the current track.
        // Do this before scheduling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;
            
            for (var instId in r._song._instruments) {
              r._song._instruments[instId].triggerRelease(rtNote._id, delay);
            }
            delete playingNotes[rtNoteId];
          }
        }

        if (r.isPlaying()) {
          for (var playlistId in track._playlist) {
            var ptnId     = track._playlist[playlistId]._ptnId;
            var itemStart = track._playlist[playlistId]._start;
            var itemEnd   = itemStart + track._playlist[playlistId]._length;

            // Don't schedule notes from playlist items that aren't in this
            // scheduling window
            if ((itemStart < scheduleStart && itemEnd < scheduleStart) ||
                (itemStart > scheduleEnd)) {
              continue;
            }

            var noteMap = r._song._patterns[ptnId]._noteMap;

            // TODO: find a more efficient way to determine which notes to play
            for (var noteId in noteMap) {
              var note = noteMap[noteId];
              var start = note.getStart() + itemStart;

              if (start >= scheduleStart &&
                  start < scheduleEnd && 
                  start < itemEnd) {
                var delay = r.ticks2Seconds(start) - curPos;

                var startTime = curTime + delay;
                var endTime = startTime + r.ticks2Seconds(note._length);

                var rtNote = new r.RtNote(note._pitch, startTime, endTime);
                playingNotes[rtNote._id] = rtNote;

                for (var instId in r._song._instruments) {
                  r._song._instruments[instId].triggerAttack(rtNote._id, note.getPitch(), delay);
                }
              }
            }
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
    var startTime = 0;

    // Loop start and end position in ticks, default is one measure
    var loopStart   = 0;
    var loopEnd     = 1920;
    var loopEnabled = false;

    function resetPlayback(resetPoint) {
      lastScheduled = resetPoint;

      scheduleWorker.postMessage({ playing: false });

      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          for (var instId in r._song._instruments) {
            r._song._instruments[instId].triggerRelease(rtNoteId, 0);
          }
          delete playingNotes[rtNoteId];
        }
      }

      scheduleWorker.postMessage({ playing: true });
    }

    r.startPlayback = function() {
      if (!r._active || playing) {
        return;
      }

      // Flush any notes that might be lingering
      resetPlayback(r.seconds2Ticks(time));

      playing = true;
      r.moveToPositionSeconds(time);
      startTime = r._ctx.currentTime;

      // Force the first round of scheduling
      scheduleNotes();

      // Restart the worker
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!r._active || !playing) {
        return;
      }

      playing = false;
      scheduleWorker.postMessage({ playing: false });
      resetPlayback(r.seconds2Ticks(time));
      time = getPosition(true);
    };

    r.loopPlayback = function (nowTicks) {
      var tickDiff = nowTicks - loopEnd;

      if (tickDiff > 0) {
        console.log("[Rhomb] Loopback missed loop start by " + tickDiff + " ticks");
        resetPlayback(loopStart);
        r.moveToPositionTicks(loopStart);
      }

      resetPlayback(loopStart + tickDiff);
      r.moveToPositionTicks(loopStart + tickDiff);
      scheduleNotes();
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

    r.getElapsedTime = function() {
      return r._ctx.currentTime - startTime;
    };

    r.getElapsedTicks = function() {
      return r.seconds2Ticks(r.getElapsedTime());
    };

    r.moveToPositionTicks = function(ticks) {
      var seconds = r.ticks2Seconds(ticks);
      r.moveToPositionSeconds(seconds);
    };

    r.moveToPositionSeconds = function(seconds) {
      if (playing) {
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
        for (var instId in r._song._instruments) {
          r._song._instruments[instId].triggerRelease(rtNoteId, 0);
        }
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      r._song._patterns[ptnId].addNote(note);
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      r._song._patterns[ptnId].deleteNote(noteId);

      // TODO: find another way to terminate deleted notes
      //       as things stand, deleted notes will stop playing
      //       naturally, but not when the pattern note is deleted
      /*
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (noteId in playingNotes) {
          r.Instrument.triggerRelease(rtNoteId, 0);
          delete playingNotes[rtNoteId];
        }
      }
      */
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined)
        return;

      var curTicks = r.seconds2Ticks(r.getPosition());

      // TODO: See note in deleteNote()
      /*
      for (var trkId in r._song._tracks) {
        var track = r._song._tracks[trkId];
        var playingNotes = track._playingNotes;

        if (rtNoteId in playingNotes) {
          r.Instrument.triggerRelease(rtNoteId, 0);
          delete playingNotes[rtNoteId];
        }
      }
      */

      note._start = start;
      note._length = length;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (note === undefined) {
        return;
      }

      if (pitch === note.getPitch()) {
        return;
      }

      for (var instId in r._song._instruments) {
        r._song._instruments[instId].triggerRelease(rtNoteId, 0);
      }
      note._pitch = pitch;
    };

    // Makes a copy of the source pattern and adds it to the song's
    // pattern set. It might be preferable to just return the copy
    // without adding it to the song -- I dunno.
    r.Edit.copyPattern = function(ptnId) {
      var src = r._song._patterns[ptnId];

      if (src === undefined) {
        return undefined;
      }

      var dst = new r.Pattern();

      for (var noteId in src._noteMap) {
        var srcNote = src._noteMap[noteId];
        var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length);

        dst._noteMap[dstNote._id] = dstNote;
      }

      r._song._patterns[dst._id] = dst;

      return dst._id;
    };
  };
})(this.Rhombus);
