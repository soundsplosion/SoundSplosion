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
    this._globalTarget = 0;

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

    this.setGlobalTarget = function(target) {
      console.log("[Rhombus] - setting global target to " + target);
      this._globalTarget = +target;
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
        enumerable: true,
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
    root.Rhombus._undoSetup(this);
  };

})(this);

//! rhombus.util.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus.Util = {};

  window.isDefined = function(obj) {
    return typeof obj !== "undefined";
  };

  window.notDefined = function(obj) {
    return typeof obj === "undefined";
  };

  window.isObject = function(obj) {
    return typeof obj === "object";
  };

  window.notObject = function(obj) {
    return typeof obj !== "object";
  };

  window.isInteger = function(obj) {
    return Math.round(obj) === obj;
  };

  window.isNumber = function(obj) {
    return typeof obj === "number";
  }

  window.notNumber = function(obj) {
    return typeof obj !== "number";
  }

  window.isNull = function(obj) {
    return obj === null;
  };

  window.notNull = function(obj) {
    return obj !== null;
  };

  window.quantizeTick = function(tickVal, quantize) {
    if ((tickVal % quantize) > (quantize / 2)) {
      return (Math.floor(tickVal/quantize) * quantize) + quantize;
    }
    else {
      return Math.floor(tickVal/quantize) * quantize;
    }
  };

  window.roundTick = function(tickVal, quantize) {
    return Math.floor(tickVal/quantize) * quantize;
  };

  window.ticksToMusicalTime = function(ticks) {
    if (notDefined(ticks)) {
      return undefined;
    }

    var jsonTime = {
      "bar"     : 1 + Math.floor(ticks/1920),
      "beat"    : 1 + Math.floor(ticks/480)%4,
      "qtrBeat" : 1 + Math.floor(ticks/120)%4,
      "ticks"   : Math.floor(ticks%120)
    };

    return jsonTime;
  }

  window.ticksToMusicalValue = function(ticks) {
    if (notDefined(ticks)) {
      return undefined;
    }

    var jsonTime = {
      "bar"     : Math.floor(ticks/1920),
      "beat"    : Math.floor(ticks/480)%4,
      "qtrBeat" : Math.floor(ticks/120)%4,
      "ticks"   : Math.floor(ticks%120)
    };

    return jsonTime;
  }

  window.musicalTimeToTicks = function(time) {
    if (notDefined(time)) {
      return undefined;
    }

    var barTicks  = (time["bar"] - 1) * 1920;
    var beatTicks = (time["beat"] - 1) * 480;
    var qtrBeatTicks = (time["qtrBeat"] - 1) * 120;

    return (barTicks + beatTicks + qtrBeatTicks + time["ticks"]);
  };

  window.stringToTicks = function(timeString, isPos) {
    var bar = 0;
    var beat = 0;
    var qtrBeat = 0;
    var ticks = 0;

    var tokens = timeString.split(/(\D+)/);
    var parsed = new Array(4);

    var offset = (isDefined(isPos) && isPos) ? 1 : 0;

    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      // handle even tokens
      if (((i + 1) % 2) == 1) {
        if (isInteger(+token) && +token >= 0) {
          parsed[Math.floor(i/2)] = +token - offset;
        }
        else {
          return undefined;
        }
      }
      // odd tokens must be a single period
      else {
        if (token !== '.') {
          return undefined;
        }
      }
    }

    var ticks = 0;

    if (isDefined(parsed[0])) {
      ticks += parsed[0] * 1920;
    }

    if (isDefined(parsed[1])) {
      ticks += parsed[1] * 480;
    }

    if (isDefined(parsed[2])) {
      ticks += parsed[2] * 120;
    }

    if (isDefined(parsed[3])) {
      ticks += parsed[3] + offset;
    }

    return ticks;
  };

  // src: http://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
  window.getRandomColor = function() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  function calculator(noteNum) {
    return Math.pow(2, (noteNum-69)/12) * 440;
  }

  var table = [];
  for (var i = 0; i <= 127; i++) {
    table[i] = calculator(i);
  }

  // Converts a note-number (typical range 0-127) into a frequency value
  Rhombus.Util.noteNum2Freq = function(noteNum) {
    return table[noteNum];
  }

  function IdSlotContainer(slotCount) {
    this._slots = [];
    this._map = {};
    this._count = slotCount;
  }

  IdSlotContainer.prototype.getById = function(id) {
    id = +id;
    if (id in this._map) {
      return this._map[id];
    } else {
      return undefined;
    }
  };

  IdSlotContainer.prototype.addObj = function(obj, idx) {
    var id = obj._id;
    if (id in this._map) {
      return undefined;
    }

    if (this._slots.length === this._count) {
      return undefined;
    }

    if (notNumber(idx)) {
      idx = this._slots.length;
    }

    if (idx < 0 || idx >= this._count) {
      return undefined;
    }

    this._slots.splice(idx, 0, id);
    this._map[id] = obj;
    return obj;
  };

  IdSlotContainer.prototype.removeId = function(id) {
    id = +id;

    if (!(id in this._map)) {
      return;
    }

    for (var idx = 0; idx < this._slots.length; idx++) {
      if (this._slots[idx] === id) {
        this._slots.splice(idx, 1);
        break;
      }
    }

    var toRet = this._map[id];
    delete this._map[id];
    return toRet;
  };

  IdSlotContainer.prototype.removeObj = function(obj) {
    return this.removeId(obj._id);
  };

  IdSlotContainer.prototype.getIdBySlot = function(idx) {
    if (idx >= 0 && idx < this._count) {
      return this._slots[idx];
    } else {
      return undefined;
    }
  };

  IdSlotContainer.prototype.getObjBySlot = function(idx) {
    return this.getObjById(this.getIdBySlot(idx));
  };

  IdSlotContainer.prototype.getObjById = function(id) {
    return this._map[+id];
  };

  IdSlotContainer.prototype.getSlotByObj = function(obj) {
    return getSlotById(obj._id);
  };

  IdSlotContainer.prototype.getSlotById = function(id) {
    for (var i = 0; i < this._slots.length; i++) {
      if (this._slots[i] === id) {
        return i;
      }
    }

    return -1;
  };

  IdSlotContainer.prototype.swapSlots = function(idx1, idx2) {
    if (idx1 >= 0 && idx1 < this._count && idx2 >= 0 && idx2 < this._count) {
      var from1 = this._slots[idx1];
      this._slots[idx1] = this._slots[idx2];
      this._slots[idx2] = from1;
    }
  };

  IdSlotContainer.prototype.isFull = function() {
    return this._slots.length === this._count;
  };

  IdSlotContainer.prototype.length = function () {
    return this._slots.length;
  };

  IdSlotContainer.prototype.objIds = function() {
    return Object.keys(this._map).map(function(x) { return +x; });
  };

  Rhombus.Util.IdSlotContainer = IdSlotContainer;

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

      if (isNull(value) || notDefined(value)) {
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
      if (!Array.isArray(value)) {
        count += Rhombus._map.subtreeCount(value);
      } else {
        count += 1;
      }
    }
    return count;
  };

  Rhombus._map.unnormalizedParams = function(params, type, unnormalizeMaps) {
    if (isNull(params) || notDefined(params) ||
        typeof(params) !== "object") {
      return params;
    }

    function unnormalized(obj, thisLevelMap) {
      var returnObj = {};
      var keys = Object.keys(obj);
      for (var idx in keys) {
        var key = keys[idx];
        var value = obj[key];
        if (typeof value === "object") {
          var nextLevelMap = thisLevelMap[key];
          returnObj[key] = unnormalized(value, nextLevelMap);
        } else {
          var ctrXformer = isDefined(thisLevelMap) ? thisLevelMap[key][0] : undefined;
          if (isDefined(ctrXformer)) {
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

  Rhombus._map.getParameterValue = function(obj, leftToCount) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!isNumber(value)) {
        var value = Rhombus._map.getParameterValue(value, leftToCount);
        if (value < -0.5) {
          leftToCount = (-1)*(value+1);
        } else {
          return value;
        }
      } else if (leftToCount === 0) {
        return value;
      } else {
        leftToCount -= 1;
      }
    }
    return (-1)*(leftToCount+1);
  };

  Rhombus._map.getParameterValueByName = function(obj, name) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) == key) {
        if (name.length == key.length) {
          return value;
        } else if (name[key.length] == ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          var generated = Rhombus._map.getParameterValueByName(value, newName);
          if (isUndefined(generated)) {
            return;
          } else {
            return generated;
          }
        }
      }
    }
  };

  Rhombus._map.generateSetObject = function(obj, leftToCount, paramValue) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!Array.isArray(value)) {
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

  Rhombus._map.generateSetObjectByName = function(obj, name, paramValue) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) === key) {
        if (name.length === key.length) {
          var toRet = {};
          toRet[key] = paramValue;
          return toRet;
        } else if (name[key.length] === ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          var generated = Rhombus._map.generateSetObjectByName(value, newName, paramValue);
          if (typeof generated === "object") {
            var toRet = {};
            toRet[key] = generated;
            return toRet;
          } else {
            return;
          }
        }
      }
    }
  };

  Rhombus._map.getParameterName = function(obj, leftToCount) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (!Array.isArray(value)) {
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

  Rhombus._map.getDisplayFunctionByName = function(obj, name) {
    var keys = Object.keys(obj);
    for (var keyIdx in keys) {
      var key = keys[keyIdx];
      var value = obj[key];
      if (name.substring(0, key.length) === key) {
        if (name.length === key.length) {
          return value[1];
        } else if (name[key.length] === ':') {
          // We matched the first part of the name
          var newName = name.substring(key.length+1);
          return Rhombus._map.getDisplayFunctionByName(value, newName);
        }
      }
    }
  };

  Rhombus._map.generateDefaultSetObj = function(obj) {
    var keys = Object.keys(obj);
    var toRet = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (!Array.isArray(value)) {
        toRet[key] = Rhombus._map.generateDefaultSetObj(value);
      } else {
        if (isDefined(value[2])) {
          toRet[key] = value[2];
        }
      }
    }
    return toRet;
  };

  // Frequently used mappings.
  // TODO: fix envelope function mappings
  Rhombus._map.timeMapFn = Rhombus._map.mapExp(0.001, 10);
  Rhombus._map.freqMapFn = Rhombus._map.mapExp(1, 22100);
  Rhombus._map.lowFreqMapFn = Rhombus._map.mapExp(1, 100);
  Rhombus._map.exponentMapFn = Rhombus._map.mapExp(0.1, 10);
  Rhombus._map.harmMapFn = Rhombus._map.mapLinear(-1000, 1000);

  function secondsDisplay(v) {
    return v + " s";
  }
  Rhombus._map.secondsDisplay = secondsDisplay;

  function dbDisplay(v) {
    return v + " dB";
  }
  Rhombus._map.dbDisplay = dbDisplay;

  function rawDisplay(v) {
    return v + "";
  }
  Rhombus._map.rawDisplay = rawDisplay;

  function hzDisplay(v) {
    return v + " Hz";
  }
  Rhombus._map.hzDisplay = hzDisplay;

  Rhombus._map.envelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,     secondsDisplay, 0.25],
    "sustain"  : [Rhombus._map.mapIdentity,   rawDisplay,     1.0],
    "release"  : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "exponent" : [Rhombus._map.exponentMapFn, rawDisplay,     0.5]
  };

  Rhombus._map.filterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                         "highshelf", "peaking", "notch", "allpass"), rawDisplay, 0],
    "frequency" : [Rhombus._map.freqMapFn, hzDisplay, 1.0],
    "rolloff" : [Rhombus._map.mapDiscrete(-12, -24, -48), dbDisplay, 0.5],
    // TODO: verify this is good
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    // TODO: verify this is good
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterEnvelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,     secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,     secondsDisplay, 0.5],
    "sustain"  : [Rhombus._map.mapIdentity,   rawDisplay,     0.0],
    "release"  : [Rhombus._map.timeMapFn,     secondsDisplay, 0.25],
    "min"      : [Rhombus._map.freqMapFn,     hzDisplay,      0.0],
    "max"      : [Rhombus._map.freqMapFn,     hzDisplay,      0.0],
    "exponent" : [Rhombus._map.exponentMapFn, rawDisplay,     0.5]
  };

})(this.Rhombus);

//! rhombus.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {

  Rhombus.Master = function() {
    Tone.Effect.call(this);
    this.setDry(1);
    this.toMaster();
    this.isMaster = function() { return true; };
  }
  Tone.extend(Rhombus.Master, Tone.Effect);

})(this.Rhombus);

//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  Rhombus._graphSetup = function(r) {

    function connectionExists(a, b) {
      function cycleProof(a, b, seen) {
        if (a._id === b._id) {
          return true;
        }

        var newSeen = seen.slice(0);
        newSeen.push(a);

        var inAny = false;
        a.graphChildren().forEach(function(child) {
          if (newSeen.indexOf(child) !== -1) {
            return;
          }
          inAny = inAny || cycleProof(child, b, newSeen);
        });

        return inAny;
      }

      return cycleProof(a, b, []);
    }

    function graphConnect(B) {
      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
      }
      if (notDefined(B._graphParents)) {
        B._graphParents = [];
      }

      if (connectionExists(B, this)) {
        return false;
      }

      this._graphChildren.push(B._id);
      B._graphParents.push(this._id);

      this.connect(B);
      return true;
    };

    function graphDisconnect(B) {
      if (notDefined(this._graphChildren)) {
        this._graphChildren = [];
        return;
      }

      var idx = this._graphChildren.indexOf(B._id);
      if (idx === -1) {
        return;
      }

      this._graphChildren.splice(idx, 1);

      var BIdx = B._graphParents.indexOf(this._id);
      if (BIdx !== -1) {
        B._graphParents.splice(BIdx, 1);
      }

      // TODO: this should be replaced in such a way that we
      // don't break all the outgoing connections every time we
      // disconnect from one thing. Put gain nodes in the middle
      // or something.
      this.disconnect();
      this._graphChildren.forEach(function(idx) {
        var child = graphLookup(idx);
        if (isDefined(child)) {
          this.connect(child);
        }
      });
    }

    function graphLookup(id) {
      var instr = r._song._instruments.getObjById(id);
      if (isDefined(instr)) {
        return instr;
      }
      return r._song._effects[id];
    }

    function graphChildren() {
      if (notDefined(this._graphChildren)) {
        return [];
      }
      return this._graphChildren.filter(isDefined).map(graphLookup);
    }

    function graphParents() {
      if (notDefined(this._graphParents)) {
        return [];
      }
      return this._graphParents.filter(isDefined).map(graphLookup);
    }

    r._addGraphFunctions = function(ctr) {
      ctr.prototype.graphChildren = graphChildren;
      ctr.prototype.graphParents = graphParents;
      ctr.prototype.graphConnect = graphConnect;
      ctr.prototype.graphDisconnect = graphDisconnect;
    };

    r._toMaster = function(node) {
      var effects = r._song._effects;
      var master;
      var effectIds = Object.keys(effects);
      for (var idIdx in effectIds) {
        var effect = effects[effectIds[idIdx]];
        if (effect.isMaster()) {
          master = effect;
          break;
        }
      }

      if (notDefined(master)) {
        return;
      }

      node.graphConnect(master);
    };

    r._importFixGraph = function() {
      var instruments = this._song._instruments;
      instruments.objIds().forEach(function(id) {
        var instr = instruments.getObjById(id);
        instr.graphChildren().forEach(function(child) {
          instr.connect(child);
        });
      });
      var effects = this._song._effects;
      for (var effectId in effects) {
        var effect = effects[effectId];
        effect.graphChildren().forEach(function(child) {
          effect.connect(child);
        });
      }
    };

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
      feedbackGain.gain.linearRampToValueAtTime(gain, this._ctx.currentTime + 0.1);
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
        preGain.gain.linearRampToValueAtTime(1.0, this._ctx.currentTime + 0.1);
      } else {
        enabled = false;
        preGain.gain.linearRampToValueAtTime(0.0, this._ctx.currentTime + 0.1);
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
    Tone.extend(SuperToneSampler, Tone.Sampler);

    SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
      // Exactly as in Tone.Sampler, except add a parameter to let you control
      // sample offset.
      if (notDefined(offset)) {
        offset = 0;
      }

      time = this.toSeconds(time);
      this.player.setPlaybackRate(this._playbackRate, time);
      this.player.start(time, offset);
      this.envelope.triggerAttack(time, velocity);
      this.filterEnvelope.triggerAttack(time);
    };

    SuperToneSampler.prototype.set = function(params) {
      if (notDefined(params)) {
        return;
      }

      if (isDefined(params.volume)) {
        this.player.setVolume(params.volume);
      }
      if (isDefined(params.playbackRate)) {
        this._playbackRate = params.playbackRate;
      }

      Tone.Sampler.prototype.set.call(this, params);
    };

    function Sampler(options, id) {
      if (isNull(id) || notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      Tone.Instrument.call(this);

      this._names = {};
      this.samples = {};
      this._triggered = {};
      this._currentParams = {};

      var sampleSet = "drums1";
      if (isDefined(options) && isDefined(options.sampleSet)) {
        sampleSet = options.sampleSet;
      }
      this._sampleSet = sampleSet;

      var thisSampler = this;

      var finish = function() {
        var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps["samp"]);
        thisSampler._normalizedObjectSet(def, true);
        if (isDefined(options) && isDefined(options.params)) {
          thisSampler._normalizedObjectSet(options.params, true);
        }
      };

      if (isDefined(r._sampleResolver)) {
        r._sampleResolver(sampleSet, function(bufferMap) {
          thisSampler.setBuffers(bufferMap);
          finish();
        });
      } else {
        finish();
      }
    }
    Tone.extend(Sampler, Tone.Instrument);
    r._addGraphFunctions(Sampler);

    Sampler.prototype.setBuffers = function(bufferMap) {
      if (notDefined(bufferMap)) {
        return;
      }

      this.killAllNotes();

      this._names = {};
      this.samples = {};
      this._triggered = {};

      var pitches = Object.keys(bufferMap);
      for (var i = 0; i < pitches.length; ++i) {
        var pitch = pitches[i];
        var sampler = new SuperToneSampler();
        var bufferAndName = bufferMap[pitch];
        sampler.player.setBuffer(bufferAndName[0]);
        sampler.connect(this.output);

        this.samples[pitch] = sampler;
        var sampleName = bufferAndName[1];
        if (notDefined(sampleName)) {
          this._names[pitch] = "" + i;
        } else {
          this._names[pitch] = sampleName;
        }
      }
    };

    Sampler.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      if (Object.keys(this.samples).length === 0) {
        return;
      }

      if (pitch < 0 || pitch > 127) {
        return;
      }

      // TODO: remove this temporary kludge after the beta
      pitch = (pitch % 12) + 36;

      var sampler = this.samples[pitch];
      if (notDefined(sampler)) {
        return;
      }

      this._triggered[id] = pitch;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      // TODO: real keyzones, pitch control, etc.
      if (delay > 0) {
        sampler.triggerAttack(0, "+" + delay, velocity);
      } else {
        sampler.triggerAttack(0, "+0", velocity);
      }
    };

    Sampler.prototype.triggerRelease = function(id, delay) {
      delete this._triggered[id];
      return;
      // HACK: maybe leaking
      /*
      if (this.samples.length === 0) {
        return;
      }

      var idx = this._triggered[id];
      if (notDefined(idx)) {
        return;
      }

      if (delay > 0) {
        this.samples[idx].triggerRelease("+" + delay);
      } else {
        this.samples[idx].triggerRelease();
      }
      */
    };

    Sampler.prototype.killAllNotes = function() {
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.triggerRelease();
      }
      this.triggered = {};
    };

    Sampler.prototype._trackParams = function(params) {
      Rhombus._map.mergeInObject(this._currentParams, params);
    };

    Sampler.prototype.toJSON = function() {
      var params = { 
        "params": this._currentParams,
        "sampleSet": this._sampleSet
      };

      var gc, gp;
      if (isDefined(this._graphChildren)) {
        gc = this._graphChildren;
      } else {
        gc = [];
      }

      if (isDefined(this._graphParents)) {
        gp = this._graphParents;
      } else {
        gp = [];
      }

      var jsonVersion = {
        "_id": this._id,
        "_type": "samp",
        "_params": params,
        "_graphChildren": gc,
        "_graphParents": gp
      };
      return jsonVersion;
    };

    // The map is structured like this for the Rhombus._map.unnormalizedParams call.
    var unnormalizeMaps = {
      "samp" : {
        "volume" : [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 0.1],
        "playbackRate" : [Rhombus._map.mapExp(0.1, 10), Rhombus._map.rawDisplay, 0.5],
        "player" : {
          "loop" : [Rhombus._map.mapDiscrete(false, true), Rhombus._map.rawDisplay, 0]
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
        "filter" : Rhombus._map.filterMap
      }
    };

    function unnormalizedParams(params) {
      return Rhombus._map.unnormalizedParams(params, "samp", unnormalizeMaps);
    }

    Sampler.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var rthis = this;
        var oldParams = this._currentParams;

        r.Undo._addUndoAction(function() {
          rthis._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);

      var unnormalized = unnormalizedParams(params);
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.set(unnormalized);
      }
    };

    Sampler.prototype.parameterCount = function() {
      return Rhombus._map.subtreeCount(unnormalizeMaps["samp"]);
    };

    Sampler.prototype.parameterName = function(paramIdx) {
      var name = Rhombus._map.getParameterName(unnormalizeMaps["samp"], paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    };

    // Parameter display stuff
    Sampler.prototype.parameterDisplayString = function(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    };

    Sampler.prototype.parameterDisplayStringByName = function(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps["samp"], paramName, curValue);
      var realObj = unnormalizedParams(setObj, this._type);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(unnormalizeMaps["samp"], paramName);
      return disp(displayValue);
    };

    Sampler.prototype.normalizedGet = function(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    };

    Sampler.prototype.normalizedGetByName = function(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    };

    Sampler.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps["samp"], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    Sampler.prototype.normalizedSetByName = function(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps["samp"], paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
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

    function Instrument(type, options, id) {
      var ctr = typeMap[type];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "mono";
        ctr = mono;
      }

      if (notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._currentParams = {};
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }

    Tone.extend(Instrument, Tone.PolySynth);
    r._addGraphFunctions(Instrument);

    r.addInstrument = function(type, options, gc, gp, id, idx) {
      var instr;
      if (type === "samp") {
        instr = new this._Sampler(options, id);
      } else {
        instr = new Instrument(type, options, id);
      }

      if (isDefined(gc)) {
        for (var i = 0; i < gc.length; i++) {
          gc[i] = +(gc[i]);
        }
        instr._graphChildren = gc;
      } else {
        r._toMaster(instr);
      }

      if (isDefined(gp)) {
        for (var i = 0; i < gp.length; i++) {
          gp[i] = +(gp[i]);
        }
        instr._graphParents = gp;
      }

      if (isNull(instr) || notDefined(instr)) {
        return;
      }

      this._song._instruments.addObj(instr, idx);
      return instr._id;
    };

    function inToId(instrOrId) {
      var id;
      if (typeof instrOrId === "object") {
        id = instrOrId._id;
      } else {
        id = +instrOrId;
      }
      return id;
    }

    r.removeInstrument = function(instrOrId) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      r._song._instruments.removeId(id);
    };

    Instrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
      // Don't play out-of-range notes
      if (pitch < 0 || pitch > 127) {
        return;
      }
      var tA = Tone.PolySynth.prototype.triggerAttack;

      var freq = Rhombus.Util.noteNum2Freq(pitch);
      this._triggered[id] = freq;

      velocity = (+velocity >= 0.0 && +velocity <= 1.0) ? +velocity : 0.5;

      if (delay > 0) {
        tA.call(this, freq, "+" + delay, velocity);
      } else {
        tA.call(this, freq, "+" + 0, velocity);
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
      delete this._triggered[id];
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
      var gc, gp;
      if (isDefined(this._graphChildren)) {
        gc = this._graphChildren;
      } else {
        gc = [];
      }

      if (isDefined(this._graphParents)) {
        gp = this._graphParents;
      } else {
        gp = [];
      }

      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphChildren": gc,
        "_graphParents": gp
      };
      return jsonVersion;
    };
                       //Scale  Vis    Discrt BP          Index
    var paramMap = [ 
      ["portamento",       1,   false, false, false],  // 00
      ["volume",           4,   true,  false, false],  // 01
      ["osc_type",         5,   true,  true,  false],  // 02
      ["amp_attack",       1,   true,  false, false],  // 03
      ["amp_decay",        1,   true,  false, false],  // 04
      ["amp_sustain",      1,   true,  false, false],  // 05
      ["amp_release",      1,   true,  false, false],  // 06
      ["amp_exp",          1,   false, false, false],  // 07
      ["filter_type",      1,   false, false, false],  // 08
      ["filter_cutoff",    1,   true,  false, false],  // 09
      ["filter_rolloff",   1,   false, false, false],  // 10
      ["filter_resonance", 1,   true,  false, false],  // 11
      ["filter_gain",      1,   false, false, false],  // 12
      ["filter_attack",    1,   true,  false, false],  // 13
      ["filter_decay",     1,   true,  false, false],  // 14
      ["filter_sustain",   1,   true,  false, false],  // 15
      ["filter_release",   1,   true,  false, false],  // 16
      ["filter_min",       1,   false, false, false],  // 17
      ["filter_mod",       2,   true,  false, false],  // 18
      ["filter_exp",       1,   false, false, false],  // 19
      ["osc_detune",      10,   true,  false, true]    // 20
    ];

    Instrument.prototype.getParamMap = function() {
      var json = {};
      for (var i = 0; i < paramMap.length; i++) {
        var param = {
          "name"     : paramMap[i][0],
          "scale"    : paramMap[i][1],
          "visible"  : paramMap[i][2],
          "discrete" : paramMap[i][3],
          "bipolar"  : paramMap[i][4]
        };
        json[i] = param;
      }
      return JSON.stringify(json);
    };

    Instrument.prototype.getInterface = function() {

      var div = document.createElement("div");

      for (var i = 0; i < paramMap.length; i++) {
        var param = paramMap[i];

        // don't draw invisible or (temporarily) discrete controls
        if (!param[2] || param[3]) {
          continue;
        }        

        // paramter range and value crap
        var value = this.normalizedGet(i) * param[1];
        var min = 0;
        var max = 1;
        var step = 0.01;

        if (param[4]) {
          min = -1;
          max = 1;
          step = (max - min) / 100;
          value = value - 0.5;
        }

        var form = document.createElement("form");
        form.setAttribute("oninput", param[0] +"Val.value=" + param[0] + ".value");

        // control label
        form.appendChild(document.createTextNode(param[0]));
        
        var ctrl = document.createElement("input");
        ctrl.setAttribute("id",     param[0]);
        ctrl.setAttribute("name",   param[0]);
        ctrl.setAttribute("class",  "newSlider");
        ctrl.setAttribute("type",   "range");
        ctrl.setAttribute("min",    min);
        ctrl.setAttribute("max",    max);
        ctrl.setAttribute("step",   step);
        ctrl.setAttribute("value",  value);
        ctrl.setAttribute("width",  "15px");

        var output = document.createElement("output");
        output.setAttribute("id",    param[0] + "Val");
        output.setAttribute("name",  param[0] + "Val");
        //output.setAttribute("value", value);

        form.appendChild(output);
        form.appendChild(ctrl);

        div.appendChild(form);
        div.appendChild(document.createElement("br"));
      }

      return div;
    };

    var secondsDisplay = Rhombus._map.secondsDisplay;
    var dbDisplay = Rhombus._map.dbDisplay;
    var rawDisplay = Rhombus._map.rawDisplay;
    var hzDisplay = Rhombus._map.hzDisplay;

    var monoSynthMap = {
      "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
      "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
      "oscillator" : {
        "type" : [Rhombus._map.mapDiscrete("square", "sawtooth", "triangle", "sine", "pulse", "pwm"), rawDisplay, 0.0],
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.filterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0.5]
    };

    var unnormalizeMaps = {
      "mono" : monoSynthMap,

      "am" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "fm" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), secondsDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        // TODO: verify this is good
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        // TODO: verify this is good
        "modulationIndex" : [Rhombus._map.mapLinear(-5, 5), rawDisplay, 0.5],
        "carrier" : monoSynthMap,
        "modulator" : monoSynthMap
      },

      "noise" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "noise" : {
          "type" : [Rhombus._map.mapDiscrete("white", "pink", "brown"), rawDisplay, 0.0]
        },
        "envelope" : Rhombus._map.envelopeMap,
        "filter" : Rhombus._map.filterMap,
        "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      },

      "duo" : {
        "portamento" : [Rhombus._map.mapLinear(0, 10), rawDisplay, 0],
        // TODO: verify this is good
        "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
        "vibratoAmount" : [Rhombus._map.mapLinear(0, 20), rawDisplay, 0.025],
        "vibratoRate" : [Rhombus._map.freqMapFn, hzDisplay, 0.1],
        "vibratoDelay" : [Rhombus._map.timeMapFn, secondsDisplay, 0.1],
        "harmonicity" : [Rhombus._map.harmMapFn, rawDisplay, 0.5],
        "voice0" : monoSynthMap,
        "voice1" : monoSynthMap
      }
    };

    function unnormalizedParams(params, type) {
      return Rhombus._map.unnormalizedParams(params, type, unnormalizeMaps);
    }

    Instrument.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var rthis = this;
        var oldParams = this._currentParams;

        r.Undo._addUndoAction(function() {
          rthis._normalizedObjectSet(oldParams, true);
        });
      }
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
    };

    // Parameter display string stuff
    Instrument.prototype.parameterDisplayString = function(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    };

    Instrument.prototype.parameterDisplayStringByName = function(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, curValue);
      var realObj = unnormalizedParams(setObj, this._type);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(unnormalizeMaps[this._type], paramName);
      return disp(displayValue);
    };

    // Parameter getting/setting stuff
    Instrument.prototype.normalizedGet = function(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    };

    Instrument.prototype.normalizedGetByName = function(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    }

    Instrument.prototype.normalizedSet = function(paramIdx, paramValue) {
      var setObj = Rhombus._map.generateSetObject(unnormalizeMaps[this._type], paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    Instrument.prototype.normalizedSetByName = function(paramName, paramValue) {
      var setObj = Rhombus._map.generateSetObjectByName(unnormalizeMaps[this._type], paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    };

    function getInstIdByIndex(instrIdx) {
      return r._song._instruments.objIds()[instrIdx];
    }

    function getGlobalTarget() {
      var inst = r._song._instruments.getObjById(getInstIdByIndex(r._globalTarget));
      if (notDefined(inst)) {
        console.log("[Rhombus] - Trying to set parameter on undefined instrument -- dame dayo!");
        return undefined;
      }
      return inst;
    }

    r.getParameter = function(paramIdx) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      return inst.normalizedGet(paramIdx);
    };

    r.getParameterByName = function(paramName) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      return inst.normalizedGetByName(paramName);
    }

    r.setParameter = function(paramIdx, value) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      inst.normalizedSet(paramIdx, value);
      return value;
    };

    r.setParameterByName = function(paramName, value) {
      var inst = getGlobalTarget();
      if (notDefined(inst)) {
        return undefined;
      }
      inst.normalizedSetByName(paramName, value);
      return value;
    }

    // only one preview note is allowed at a time
    var previewNote = undefined;
    r.startPreviewNote = function(pitch, velocity) {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      if (notDefined(previewNote)) {
        var targetId = getInstIdByIndex(this._globalTarget);
        var inst = this._song._instruments.getObjById(targetId);
        if (notDefined(inst)) {
          console.log("[Rhombus] - Trying to trigger note on undefined instrument");
          return;
        }

        if (notDefined(velocity) || velocity < 0 || velocity > 1) {
          velocity = 0.5;
        }

        previewNote = new this.RtNote(pitch, 0, 0, targetId);
        inst.triggerAttack(previewNote._id, pitch, 0, velocity);
      }
    };

    r.stopPreviewNote = function() {
      var keys = this._song._instruments.objIds();
      if (keys.length === 0) {
        return;
      }

      if (isDefined(previewNote)) {
        var inst = this._song._instruments.getObjById(previewNote._target);
        if (notDefined(inst)) {
          console.log("[Rhombus] - Trying to release note on undefined instrument");
          return;
        }

        inst.triggerRelease(previewNote._id, 0);
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
    var mast = Rhombus.Master;

    r._addGraphFunctions(dist);
    r._addGraphFunctions(mast);
    installFunctions(dist);
    installFunctions(mast);

    var typeMap = {
      // TODO: more effect types
      "dist": dist,
      "mast": mast
    };

    function makeEffect(type, options, gc, gp, id) {
      var ctr = typeMap[type];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "dist";
        ctr = dist;
      }

      var unnormalized = unnormalizedParams(options, type);
      var eff = new ctr(unnormalized);
      if (isNull(id) || notDefined(id)) {
        r._newId(eff);
      } else {
        r._setId(eff, id);
      }

      if (isDefined(gc)) {
        for (var i = 0; i < gc.length; i++) {
          gc[i] = +(gc[i]);
        }
        eff._graphChildren = gc;
      }
      if (isDefined(gp)) {
        for (var i = 0; i < gp.length; i++) {
          gp[i] = +(gp[i]);
        }
        eff._graphParents = gp;
      }

      eff._type = type;
      eff._currentParams = {};
      eff._trackParams(options);

      return eff;
    }

    function isMaster() { return false; }
    function installFunctions(ctr) {
      ctr.prototype.normalizedObjectSet = normalizedObjectSet;
      ctr.prototype.parameterCount = parameterCount;
      ctr.prototype.parameterName = parameterName;
      ctr.prototype.normalizedSet = normalizedSet;
      ctr.prototype.toJSON = toJSON;
      ctr.prototype._trackParams = trackParams;
      ctr.prototype.isMaster = isMaster;
    }

    var masterAdded = false;
    r.addEffect = function(type, options, gc, gp, id) {
      if (masterAdded && type === "mast") {
        return;
      }

      var effect = makeEffect(type, options, gc, gp, id);

      if (isNull(effect) || notDefined(effect)) {
        return;
      }

      this._song._effects[effect._id] = effect;
      return effect._id;
    }

    // Add the master effect
    r.addEffect("mast");

    function inToId(effectOrId) {
      var id;
      if (typeof effectOrId === "object") {
        id = effectOrId._id;
      } else {
        id = +effectOrId;
      }
      return id;
    }

    r.removeEffect = function(effectOrId) {
      var id = inToId(effectOrId);
      if (id < 0) {
        return;
      }

      delete this._song._effects[id];
    }

    function toJSON(params) {
      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphChildren": this._graphChildren,
        "_graphParents": this._graphParents
      };
      return jsonVersion;
    }

    // Parameter stuff
    var unnormalizeMaps = {
      "dist" : {
        "dry" : Rhombus._map.mapIdentity,
        "wet" : Rhombus._map.mapIdentity
      },
      "mast" : {}
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
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // pattern metadata
      this._name = "Default Pattern Name";
      this._color = getRandomColor();

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
        if (isDefined(length) && length >= 0) {
          this._length = length;
        }
      },

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (notDefined(name)) {
          return undefined;
        } else {
          var oldName = this._name;
          this._name = name.toString();

          var rthis = this;
          r.Undo._addUndoAction(function() {
            rthis._name = oldName;
          });

          return this._name;
        }
      },

      // TODO: validate this color stuff
      getColor: function() {
        return this._color;
      },

      setColor: function(color) {
        this._color = color;
      },

      addNote: function(note) {
        this._noteMap[note._id] = note;
      },

      getNoteMap: function() {
        return this._noteMap;
      },

      deleteNote: function(noteId) {
        var note = this._noteMap[noteId];

        if (notDefined(note))
          return undefined;

        delete this._noteMap[note._id];

        return note;
      }
    };

    // TODO: Note should probably have its own source file
    r.Note = function(pitch, start, length, velocity, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // validate the pitch
      if (!isInteger(pitch) || pitch < 0 || pitch > 127) {
        return undefined;
      }

      // validate the start
      if (!isNumber(start) || start < 0) {
        return undefined;
      }

      // validate the length
      if (!isNumber(length) || length < 0) {
        return undefined;
      }

      // validate the start
      if (!isNumber(velocity) || velocity < 0) {
        return undefined;
      }

      this._pitch    = +pitch;
      this._start    = +start    || 0;
      this._length   = +length   || 0;
      this._velocity = +velocity || 0.5;
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

      getVelocity: function() {
        return this._velocity;
      },

      setVelocity: function(velocity) {
        var floatVal = parseFloat(velocity);
        if (isDefined(floatVal) && floatVal > 0 && floatVal <= 1.0) {
          this._velocity = floatVal;
        }
      },

      // TODO: check for off-by-one issues
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

    r.PlaylistItem = function(trkId, ptnId, start, length, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._trkId = trkId;
      this._ptnId = ptnId;
      this._start = start;
      this._length = length;
    };

    r.PlaylistItem.prototype = {

      setStart: function(start) {
        if (notDefined(start)) {
          return undefined;
        }

        var startVal = parseInt(start);
        if (startVal < 0) {
          return undefined;
        }

        var oldStart = this._start;
        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._start = oldStart;
        });

        return this._start = startVal;
      },

      getStart: function() {
        return this._start;
      },

      setLength: function(length) {
        if (notDefined(length)) {
          return undefined;
        }

        var lenVal = parseInt(length);
        if (lenVal < 0) {
          return undefined;
        }

        var oldLength = this._length;
        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._length = oldLength;
        });

        return this._length = lenVal;
      },

      getLength: function() {
        return this._length;
      },

      getTrackIndex: function() {
        return r._song._tracks.getSlotById(this._trkId);
      },

      getPatternId: function() {
        return this._ptnId;
      }
    };

    r.RtNote = function(pitch, start, end, target) {
      r._newRtId(this);
      this._pitch = pitch || 60;
      this._start = start || 0;
      this._end = end || 0;
      this._target = target;
    };

    r.Track = function(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // track metadata
      this._name = "Default Track Name";
      this._mute = false;
      this._solo = false;

      // track structure data
      this._target = undefined;
      this._playingNotes = {};
      this._playlist = {};
    };

    r.Track.prototype = {

      setId: function(id) {
        this._id = id;
      },

      getName: function() {
        return this._name;
      },

      setName: function(name) {
        if (notDefined(name)) {
          return undefined;
        }
        else {
          var oldValue = this._name;
          this._name = name.toString();

          r.Undo._addUndoAction(function() {
            this._name = oldValue;
          });

          return this._name;
        }
      },

      getMute: function() {
        return this._mute;
      },

      setMute: function(mute) {
        if (typeof mute !== "boolean") {
          return undefined;
        }

        this._mute = mute;
        return mute;
      },

      toggleMute: function() {
        return this.setMute(!this.getMute());
      },

      getSolo: function() {
        return this._solo;
      },

      setSolo: function(solo) {
        if (typeof solo !== "boolean") {
          return undefined;
        }

        var soloList = r._song._soloList;

        // Get the index of the current track in the solo list
        var index = soloList.indexOf(this._id);

        // The track is solo'd and solo is 'false'
        if (index > -1 && !solo) {
          soloList.splice(index, 1);
        }
        // The track is not solo'd and solo is 'true'
        else if (index < 0 && solo) {
          soloList.push(this._id);
        }

        this._solo = solo;
        return solo;
      },

      toggleSolo: function() {
        return this.setSolo(!this.getSolo());
      },

      getPlaylist: function() {
        return this._playlist;
      },

      // Determine if a playlist item exists that overlaps with the given range
      checkOverlap: function(start, end) {
        for (var itemId in this._playlist) {
          var item = this._playlist[itemId];
          var itemStart = item._start;
          var itemEnd = item._start + item._length;

          // TODO: verify and simplify this logic
          if (start < itemStart && end > itemStart) {
            return true;
          }

          if (start >= itemStart && end < itemEnd) {
            return true;
          }

          if (start >= itemStart && start < itemEnd) {
            return true;
          }
        }

        // No overlapping items found
        return false;
      },

      addToPlaylist: function(ptnId, start, length) {
        // All arguments must be defined
        if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
          return undefined;
        }

        // Don't allow overlapping playlist items
        if (this.checkOverlap(start, start+length)) {
          return undefined;
        }

        // ptnId myst belong to an existing pattern
        if (notDefined(r._song._patterns[ptnId])) {
          return undefined;
        }

        var newItem = new r.PlaylistItem(this._id, ptnId, start, length);
        this._playlist[newItem._id] = newItem;

        var rthis = this;
        r.Undo._addUndoAction(function() {
          delete rthis._playlist[newItem._id];
        });

        return newItem._id;

        // TODO: restore length checks
      },

      getPlaylistItemById: function(id) {
        return this._playlist[id];
      },

      getPlaylistItemByTick: function(tick) {
        var playlist = this._playlist;
        for (var itemId in playlist) {
          var item = playlist[itemId];
          var itemEnd = item._start + item._length;
          if (tick >= item._start && tick < itemEnd) {
            return item;
          }
        }

        // no item at this location
        return undefined;
      },

      removeFromPlaylist: function(itemId) {
        console.log("[Rhombus] - deleting playlist item " + itemId);
        itemId = itemId.toString();
        if (!(itemId in this._playlist)) {
          return undefined;
        } else {

          var obj = this._playlist[itemId];
          var rthis = this;
          r.Undo._addUndoAction(function() {
            rthis._playlist[itemId] = obj;
          });

          delete this._playlist[itemId.toString()];
        }

        return itemId;
      },

      toJSON: function() {
        // Don't include "_playingNotes"
        var toReturn = {};
        toReturn._id = this._id;
        toReturn._name = this._name;
        toReturn._target = this._target;
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
      this._length = 30720;
      this._bpm    = 120;

      this._loopStart = 0;
      this._loopEnd   = 1920;

      // song structure data
      this._tracks = new Rhombus.Util.IdSlotContainer(16);
      this._patterns = {};
      this._instruments = new Rhombus.Util.IdSlotContainer(16);
      this._effects = {};
      this._soloList = [];

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
        if (isDefined(length) && length >= 480) {
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

      getPatterns: function() {
        return this._patterns;
      },

      addPattern: function(pattern) {
        if (notDefined(pattern)) {
          var pattern = new r.Pattern();
        }
        this._patterns[pattern._id] = pattern;

        var rthis = this;
        r.Undo._addUndoAction(function() {
          delete rthis._patterns[pattern._id];
        });

        return pattern._id;
      },

      deletePattern: function(ptnId) {
        console.log("[Rhombus] - deleting ptnId " + ptnId);
        var pattern = this._patterns[ptnId];

        if (notDefined(pattern)) {
          return undefined;
        }

        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._patterns[ptnId] = pattern;
        });

        // TODO: make this action undoable
        // remove all instances of the deleted pattern from track playlists
        r._song._tracks.objIds().forEach(function(trkId) {
          var track = r._song._tracks.getObjById(trkId);
          for (var itemId in track._playlist) {
            var item = track._playlist[itemId];
            if (+item._ptnId == +ptnId) {
              track.removeFromPlaylist(itemId);
            }
          }
        });

        delete this._patterns[ptnId];
        return ptnId;
      },

      addTrack: function() {
        // Create a new Track object
        var track = new r.Track();
        this._tracks.addObj(track);

        var rthis = this;
        r.Undo._addUndoAction(function() {
          rthis._tracks.removeObj(track);
        });

        // Return the ID of the new Track
        return track._id;
      },

      deleteTrack: function(trkId) {
        trkId = +trkId;
        var track = this._tracks.getObjById(trkId);

        if (notDefined(track)) {
          return undefined;
        }
        else {
          // TODO: find a more robust way to terminate playing notes
          for (var rtNoteId in this._playingNotes) {
            var note = this._playingNotes[rtNoteId];
            r._song._instruments.getObjById(track._target).triggerRelease(rtNoteId, 0);
            delete this._playingNotes[rtNoteId];
          }

          // TODO: Figure out why this doesn't work
          //r.removeInstrument(track._target);

          // Remove the track from the solo list, if it's soloed
          var index = r._song._soloList.indexOf(track._id);
          if (index > -1) {
            r._song._soloList.splice(index, 1);
          }

          var slot = this._tracks.getSlotById(trkId);
          var track = this._tracks.removeId(trkId);

          var rthis = this;
          r.Undo._addUndoAction(function() {
            rthis._tracks.addObj(track, slot);
          });

          return trkId;
        }
      },

      getTracks: function() {
        return this._tracks;
      },

      getInstruments: function() {
        return this._instruments;
      },

      getEffects: function() {
        return this._effects;
      },

      // Song length here is defined as the end of the last
      // playlist item on any track
      findSongLength: function() {
        var length = 0;
        var thisSong = this;

        this._tracks.objIds().forEach(function(trkId) {
          var track = thisSong._tracks.getObjById(trkId);

          for (var itemId in track._playlist) {
            var item = track._playlist[itemId];
            var itemEnd = item._start + item._length;

            if (itemEnd > length) {
              length = itemEnd;
            }
          }
        });

        return length;
      }
    };

    r.getSongLengthSeconds = function() {
      return this.ticks2Seconds(this._song._length);
    };

    r.initSong = function() {
      r._song = new Song();
    };

    r.initSong();

    r.importSong = function(json) {
      this._song = new Song();
      var parsed = JSON.parse(json);
      this._song.setTitle(parsed._title);
      this._song.setArtist(parsed._artist);
      this._song._length = parsed._length || 30720;
      this._song._bpm = parsed._bpm || 120;

      this._song._loopStart = parsed._loopStart || 0;
      this._song._loopEnd = parsed._loopEnd || 1920;

      var tracks      = parsed._tracks;
      var patterns    = parsed._patterns;
      var instruments = parsed._instruments;
      var effects     = parsed._effects;

      for (var ptnId in patterns) {
        var pattern = patterns[ptnId];
        var noteMap = pattern._noteMap;

        var newPattern = new this.Pattern(+ptnId);

        newPattern._name = pattern._name;
        newPattern._length = pattern._length;

        if (isDefined(pattern._color)) {
          newPattern.setColor(pattern._color);
        }

        // dumbing down Note (e.g., by removing methods from its
        // prototype) might make deserializing much easier
        for (var noteId in noteMap) {
          var note = new this.Note(+noteMap[noteId]._pitch,
                                   +noteMap[noteId]._start,
                                   +noteMap[noteId]._length,
                                   +noteMap[noteId]._velocity || 1,
                                   +noteId);

          newPattern._noteMap[+noteId] = note;
        }

        this._song._patterns[+ptnId] = newPattern;
      }

      for (var trkIdIdx in tracks._slots) {
        var trkId = +tracks._slots[trkIdIdx];
        var track = tracks._map[trkId];
        var playlist = track._playlist;

        // Create a new track and manually set its ID
        var newTrack = new this.Track(trkId);

        newTrack._name = track._name;
        newTrack._target = +track._target;

        for (var itemId in playlist) {
          var item = playlist[itemId];
          var parentId = trkId;

          if (isDefined(item._trkId)) {

          }

          var newItem = new this.PlaylistItem(parentId,
                                              item._ptnId,
                                              item._start,
                                              item._length,
                                              item._id);

          newTrack._playlist[+itemId] = newItem;
        }

        this._song._tracks.addObj(newTrack, trkIdIdx);
      }

      for (var instIdIdx in instruments._slots) {
        var instId = instruments._slots[instIdIdx];
        var inst = instruments._map[instId];
        this.addInstrument(inst._type, inst._params, inst._graphChildren, inst._graphParents, +instId, instIdIdx);
        this._song._instruments.getObjById(instId)._normalizedObjectSet({ volume: 0.1 });
      }

      for (var effId in effects) {
        var eff = effects[effId];
        this.addEffect(eff._type, eff._params, eff._graphChildren, eff._graphParents, +effId);
      }

      this._importFixGraph();

      // restore curId -- this should be the last step of importing
      var curId;
      if (notDefined(parsed._curId)) {
        console.log("[Rhombus Import] curId not found -- beware");
      }
      else {
        this.setCurId(parsed._curId);
      }

    };

    r.setSampleResolver = function(resolver) {
      r._sampleResolver = resolver;
    };

    r.exportSong = function() {
      this._song._curId = this.getCurId();
      //this._song._length = this._song.findSongLength();
      return JSON.stringify(this._song);
    };

    r.getSong = function() {
      return this._song;
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

    var playing = false;
    var time = 0;
    var startTime = 0;

    var loopEnabled = false;
    var loopOverride = false;

    function scheduleNotes() {

      // capturing the current time and position so that all scheduling actions
      // in this time frame are on the same "page," so to speak
      var curTime = r.getElapsedTime();
      var curPos = r.getPosition();
      var nowTicks = r.seconds2Ticks(curPos);
      var aheadTicks = r.seconds2Ticks(scheduleAhead);
      var loopStart = r.getLoopStart();
      var loopEnd = r.getLoopEnd();
      var songEnd = r.getSong().getLength();

      // Determine if playback needs to loop around in this time window
      var doWrap = (!loopOverride && r.getLoopEnabled()) &&
        (r.getLoopEnd() - nowTicks < aheadTicks);

      var scheduleStart = lastScheduled;
      var scheduleEnd = (doWrap) ? r.getLoopEnd() : nowTicks + aheadTicks;
      scheduleEnd = (scheduleEnd < songEnd) ? scheduleEnd : songEnd;


      // TODO: decide to use the elapsed time since playback started,
      //       or the context time
      var scheduleEndTime = curTime + scheduleAhead;

      // Iterate over every track to find notes that can be scheduled
      r._song._tracks.objIds().forEach(function(trkId) {
        var track = r._song._tracks.getObjById(trkId);
        var playingNotes = track._playingNotes;

        // Schedule note-offs for notes playing on the current track.
        // Do this before scheduling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;
            r._song._instruments.getObjById(rtNote._target).triggerRelease(rtNote._id, delay);
            delete playingNotes[rtNoteId];
          }
        }

        // Determine how soloing and muting affect this track
        var inactive = track._mute || (r._song._soloList.length > 0 && !track._solo);

        if (r.isPlaying() && !inactive) {
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

              if (!loopOverride && r.getLoopEnabled() && start < loopStart) {
                continue;
              }

              if (start >= scheduleStart &&
                  start < scheduleEnd &&
                  start < itemEnd) {
                var delay = r.ticks2Seconds(start) - curPos;

                // TODO: disambiguate startTime
                var startTime = curTime + delay;
                var endTime = startTime + r.ticks2Seconds(note._length);

                var rtNote = new r.RtNote(note._pitch, startTime, endTime, track._target);
                playingNotes[rtNote._id] = rtNote;

                var instrument = r._song._instruments.getObjById(track._target);
                instrument.triggerAttack(rtNote._id, note.getPitch(), delay, note.getVelocity());
              }
            }
          }
        }
      });

      lastScheduled = scheduleEnd;

      if (nowTicks >= r.getLoopStart() && nowTicks < r.getLoopEnd()) {
        loopOverride = false;
      }

      if (doWrap) {
        r.loopPlayback(nowTicks);
      }
      else if (nowTicks >= r.getSong().getLength()) {
        // TODO: we SHOULD stop playback, and somehow alert the GUI
        r.stopPlayback();
        document.dispatchEvent(new CustomEvent("rhombus-stop", {"detail": "stop"}));
      }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Playback/timebase stuff
    /////////////////////////////////////////////////////////////////////////////

    // The smallest unit of musical time in Rhombus is one tick, and there are
    // 480 ticks per quarter note
    var TICKS_PER_BEAT = 480;

    function ticks2Beats(ticks) {
      return ticks / TICKS_PER_BEAT;
    }

    function beats2Ticks(beats) {
      return beats * TICKS_PER_BEAT;
    }

    r.ticks2Seconds = function(ticks) {
      return (ticks2Beats(ticks) / r._song._bpm) * 60;
    }

    r.seconds2Ticks = function(seconds) {
      var beats = (seconds / 60) * r._song._bpm;
      return beats2Ticks(beats);
    }

    r.setBpm = function(bpm) {
      if (notDefined(bpm) || isNull(bpm) || isNaN(+bpm) ||
          +bpm < 1 || +bpm > 1000) {
        console.log("[Rhombus] - Invalid tempo");
        return undefined;
      }

      // Rescale the end time of notes that are currently playing
      var timeScale = this._song._bpm / +bpm;
      var curTime = r.getElapsedTime();

      for (var trkIdx in this._song._tracks._slots) {
        var track = this._song._tracks.getObjBySlot(trkIdx);
        for (var noteId in track._playingNotes) {
          var note = track._playingNotes[noteId];
          var timeRemaining = (note._end - curTime) * timeScale;
          note._end = curTime + timeRemaining;
        }
      }

      // Cache the old position in ticks
      var oldTicks = this.seconds2Ticks(r.getPosition());
      this._song._bpm = +bpm;

      // Set the time position to the adjusted location
      this.moveToPositionTicks(oldTicks);
      return bpm;
    }

    r.getBpm = function() {
      return this._song._bpm;
    }

    r.killAllNotes = function() {
      var thisr = this;
      thisr._song._tracks.objIds().forEach(function(trkId) {
        var track = thisr._song._tracks.getObjById(trkId);
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          thisr._song._instruments.objIds().forEach(function(instId) {
            thisr._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
          });
          delete playingNotes[rtNoteId];
        }
      });
    };

    r.startPlayback = function() {
      if (!this._active || playing) {
        return;
      }

      // Flush any notes that might be lingering
      lastScheduled = this.seconds2Ticks(time);
      this.killAllNotes();

      playing = true;
      this.moveToPositionSeconds(time);
      startTime = this._ctx.currentTime;

      if (this.seconds2Ticks(r.getPosition()) < this.getLoopStart()) {
        loopOverride = true;
      }

      // Force the first round of scheduling
      scheduleNotes();

      // Restart the worker
      scheduleWorker.postMessage({ playing: true });
    };

    r.stopPlayback = function() {
      if (!this._active || !playing) {
        return;
      }

      playing = false;
      scheduleWorker.postMessage({ playing: false });

      // round the last scheduled tick down to the nearest 16th note
      lastScheduled = this.seconds2Ticks(time);
      lastScheduled = roundTick(lastScheduled, 120);

      this.killAllNotes();

      // round the position down to the nearest 16th note
      var nowTicks = r.seconds2Ticks(getPosition(true));
      nowTicks = roundTick(nowTicks, 120);

      time = r.ticks2Seconds(nowTicks);
    };

    r.loopPlayback = function(nowTicks) {
      var tickDiff = nowTicks - this._song._loopEnd;

      if (tickDiff > 0) {
        console.log("[Rhombus] - Loopback missed loop start by " + tickDiff + " ticks");
        lastScheduled = this._song._loopStart;
        this.moveToPositionTicks(this._song._loopStart, false);
        scheduleNotes();
      }

      this.moveToPositionTicks(this._song._loopStart + tickDiff, false);
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
      return this._ctx.currentTime - startTime;
    };

    r.getElapsedTicks = function() {
      return this.seconds2Ticks(this.getElapsedTime());
    };

    r.moveToPositionTicks = function(ticks, override) {
      lastScheduled = ticks;
      var seconds = this.ticks2Seconds(ticks);
      this.moveToPositionSeconds(seconds);

      override = (isDefined(override)) ? override : true;

      if (loopEnabled && override && (ticks > r.getLoopEnd() || ticks < r.getLoopStart())) {
        loopOverride = true;
      }

      if (ticks < r.getLoopEnd() && ticks > r.getLoopStart()) {
        loopOverride = false;
      }
    };

    r.moveToPositionSeconds = function(seconds) {
      if (playing) {
        time = seconds - this._ctx.currentTime;
      } else {
        time = seconds;
      };
    };

    r.getLoopEnabled = function() {
      return loopEnabled;
    };

    r.setLoopEnabled = function(enabled) {
      loopEnabled = enabled;

      var ticks = r.seconds2Ticks(r.getPosition());
      if (loopEnabled && ticks > r.getLoopEnd()) {
        loopOverride = true;
      }

      if (ticks < r.getLoopEnd() && loopOverride) {
        loopOverride = false;
      }
    };

    r.getLoopStart = function() {
      return this._song._loopStart;
    };

    r.getLoopEnd = function() {
      return this._song._loopEnd;
    };

    r.setLoopStart = function(start) {
      if (notDefined(start) || isNull(start)) {
        console.log("[Rhombus] - Loop start is undefined");
        return undefined;
      }

      if (start >= this._song._loopEnd || (this._song._loopEnd - start) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }

      var curPos = r.seconds2Ticks(r.getPosition());

      if (curPos < start) {
        console.log("[Rhombus] - overriding loop enabled");
        loopOverride = true;
      }

      this._song._loopStart = start;
      return this._song._loopStart;
    };

    r.setLoopEnd = function(end) {
      if (notDefined(end) || isNull(end)) {
        console.log("[Rhombus] - Loop end is undefined");
        return undefined;
      }

      if (this._song._loopStart >= end || (end - this._song._loopStart) < 480) {
        console.log("[Rhombus] - Invalid loop range");
        return undefined;
      }

      var curPos = r.seconds2Ticks(r.getPosition());

      if (curPos < this._song._loopEnd && curPos > end) {
        r.moveToPositionTicks(end);
      }

      this._song._loopEnd = end;
      return this._song._loopEnd;
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
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });
      }
    }

    r.Edit.insertNote = function(note, ptnId) {
      // TODO: put checks on the input arguments
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(note._id);
      });
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    // TODO: investigate ways to rescale RtNotes that are currently playing
    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {

      if (start < 0 || length < 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return undefined;
      }

      var oldStart = note._start;
      var oldLength = note._length;
      note._start = start;
      note._length = length;

      r.Undo._addUndoAction(function() {
        note._start = oldStart;
        note._length = oldLength;
      });

      return noteId;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note) || (pitch === note.getPitch())) {
        return undefined;
      }

      r._song._instruments.objIds().forEach(function(instId) {
        r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
      });

      note._pitch = pitch;

      // Could return anything here...
      return noteId;
    };

    r.Edit.updateNote = function(noteId, pitch, start, length, velocity, ptnId) {

      if (start < 0 || length < 1 || velocity < 0 || velocity > 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId]._noteMap[noteId];

      if (notDefined(note)) {
        return undefined;
      }

      var oldPitch    = note._pitch;
      var oldStart    = note._start;
      var oldLength   = note._length;
      var oldVelocity = note._velocity;

      note._pitch    = pitch;
      note._start    = start;
      note._length   = length;
      note._velocity = velocity;

      r.Undo._addUndoAction(function() {
        note._pitch    = oldPitch;
        note._start    = oldStart;
        note._length   = oldLength;
        note._velocity = oldVelocity;
      });

      return noteId;
    };

    // Makes a copy of the source pattern and adds it to the song's pattern set.
    r.Edit.copyPattern = function(ptnId) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn)) {
        return undefined;
      }

      var dstPtn = new r.Pattern();

      for (var noteId in srcPtn._noteMap) {
        var srcNote = srcPtn._noteMap[noteId];
        var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length,
                                 srcNote._velocity);

        dstPtn._noteMap[dstNote._id] = dstNote;
      }

      dstPtn.setName(srcPtn.getName() + "-copy");
      r._song._patterns[dstPtn._id] = dstPtn;
      return dstPtn._id;
    };

    // Splits a source pattern into two destination patterns
    // at the tick specified by the splitPoint argument.
    r.Edit.splitPattern = function(ptnId, splitPoint) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn) || !isInteger(splitPoint)) {
        return undefined;
      }

      if (splitPoint < 0 || splitPoint > srcPtn._length) {
        return undefined;
      }

      var dstL = new r.Pattern();
      var dstR = new r.Pattern();

      for (var noteId in srcPtn._noteMap) {
        var srcNote = srcPtn._noteMap[noteId];
        var dstLength = srcNote._length;

        var dstPtn;
        var dstStart;

        // Determine which destination pattern to copy into
        // and offset the note start accordingly
        if (srcNote._start < splitPoint) {
          dstPtn = dstL;
          dstStart = srcNote._start;

          // Truncate notes that straddle the split point
          if ((srcNote._start + srcNote._length) > splitPoint) {
            dstLength = splitPoint - srcNote._start;
          }
        }
        else {
          dstPtn = dstR;
          dstStart = srcNote._start - splitPoint;
        }

        // Create a new note and add it to the appropriate destination pattern
        var dstNote = new r.Note(srcNote._pitch, dstStart, dstLength, srcNote._velocity);
        dstPtn._noteMap[dstNote._id] = dstNote;
      }

      // Uniquify the new pattern names (somewhat)
      dstL.setName(srcPtn.getName() + "-A");
      dstR.setName(srcPtn.getName() + "-B");

      // Add the two new patterns to the song pattern set
      r._song._patterns[dstL._id] = dstL;
      r._song._patterns[dstR._id] = dstR;

      // return the pair of new IDs
      return [dstL._id, dstR._id];
    };

    // Returns an array containing all notes within a given horizontal (time) and
    // and vertical (pitch) range.
    //
    // The lowNote and highNote arguments are optional. If they are undefined, all
    // of the notes within the time range will be returned.
    r.Edit.getNotesInRange = function(ptnId, start, end, lowNote, highNote) {
      var srcPtn = r._song._patterns[ptnId];
      if (notDefined(srcPtn) || !isInteger(start) || !isInteger(end)) {
        return undefined;
      }

      // assign defaults to the optional arguments
      lowNote  = +lowNote  || 0;
      highNote = +highNote || 127;

      var noteArray = [];
      for (var noteId in srcPtn._noteMap) {
        var srcNote = srcPtn._noteMap[noteId];
        var srcStart = srcNote.getStart();
        var srcPitch = srcNote.getPitch();
        if (srcStart >= srcStart && srcStart < end &&
            srcPitch >= lowNote && srcPitch <= highNote) {
          noteArray.push(srcNote);
        }
      }

      // TODO: decide if we should return undefined if there are no matching notes
      return noteArray;
    };

    r.Edit.quantizeNotes = function(notes, quantize, doEnds) {
      for (var i = 0; i < notes.length; i++) {
        var srcNote = notes[i]
        var srcStart = srcNote.getStart();
        srcNote._start = quantizeTick(srcStart, quantize);

        // optionally quantize the ends of notes
        if (doEnds === true) {
          var srcLength = srcNote.getLength();
          var srcEnd = srcNote.getEnd();

          if (srcLength < quantize) {
            srcNote._length = quantize;
          }
          else {
            srcNote._length = quantizeTick(srcEnd, quantize) - srcNote.getStart();
          }
        }
      }
    };
  };
})(this.Rhombus);

//! rhombus.undo.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._undoSetup = function(r) {

    var stackSize = 5;
    var undoStack = [];

    r.Undo = {};

    // TODO: add redo
    r.Undo._addUndoAction = function(f) {
      var insertIndex = undoStack.length;
      if (undoStack.length >= stackSize) {
        undoStack.shift();
        insertIndex -= 1;
      }
      undoStack[insertIndex] = f;
    };

    r.Undo.canUndo = function() {
      return undoStack.length > 0;
    };

    r.Undo.doUndo = function() {
      if (r.Undo.canUndo()) {
        var action = undoStack.pop();
        action();
      }
    };

  };
})(this.Rhombus);
