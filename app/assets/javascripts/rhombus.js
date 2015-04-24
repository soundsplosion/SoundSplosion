//! rhombus.header.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * Creates a new Rhombus object with the specified constraints.
 * @class
 */
function Rhombus(constraints) {
  if (notDefined(constraints)) {
    constraints = {};
  }

  this._constraints = constraints;
  this._disposed = false;
  this._ctx = Tone.context;
  this._globalTarget = 0;

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


  Rhombus._midiSetup(this);

  /**
   * @member {Rhombus.Undo}
   */
  this.Undo = new Rhombus.Undo();

  Rhombus._graphSetup(this);
  Rhombus._patternSetup(this);
  Rhombus._trackSetup(this);
  Rhombus._paramSetup(this);
  Rhombus._recordSetup(this);
  Rhombus._audioNodeSetup(this);

  // Instruments
  Rhombus._instrumentSetup(this);
  Rhombus._wrappedInstrumentSetup(this);
  Rhombus._samplerSetup(this);

  // Effects
  Rhombus._masterSetup(this);
  Rhombus._wrappedEffectSetup(this);
  Rhombus._scriptEffectSetup(this);

  Rhombus._timeSetup(this);
  Rhombus._editSetup(this);

  this.initSong();
};

/** Makes this Rhombus instance unusable and releases references to resources. */
Rhombus.prototype.dispose = function() {
  this.setActive(false);
  this._disposed = true;
  delete this._ctx;
  delete this._song;
};

/**
 * Sets the global target track. Used for preview notes, MIDI input, etc.
 * @param {number} target - The id of the track to target.
 */
Rhombus.prototype.setGlobalTarget = function(target) {
  this.killAllPreviewNotes();
  this._globalTarget = +target;
};

/** Returns the id of the global target track. */
Rhombus.prototype.getGlobalTarget = function() {
  return this._globalTarget;
};

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

  window.notInteger = function(obj) {
    return !(window.isInteger(obj));
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

  window.intToHexByte = function(val) {
    if (!isInteger(+val) || +val < 0 || +val > 255) {
      return undefined;
    }

    return ("00" + val.toString(16)).substr(-2);
  };

  window.intToBytes = function(val) {
    return [ (val >> 24) & 0xFF,
             (val >> 16) & 0xFF,
             (val >>  8) & 0xFF,
             (val      ) & 0xFF ];
  };

  // Converts an integer value to a variable-length base-128 array
  window.intToVlv = function(val) {
    if (!isInteger(val) || val < 0) {
      console.log("[Rhombus] - input must be a positive integer");
      return undefined;
    }

    var chunks = [];

    for (var i = 0; i < 4; i++) {
      chunks.push(val & 0x7F);
      val = val >> 7;
    }

    chunks.reverse();

    var leading = true;
    var leadingCount = 0;

    // set the MSB on the non-LSB bytes
    for (var i = 0; i < 3; i++) {
      // keep track of the number of leading 'digits'
      if (leading && chunks[i] == 0) {
        leadingCount++;
      }
      else {
        leading = false;
      }
      chunks[i] = chunks[i] | 0x80;
    }

    // trim the leading zeros
    chunks.splice(0, leadingCount);

    return chunks;
  }

  // Converts a variable-length value back to an integer
  window.vlvToInt = function(vlv) {
    if (!(vlv instanceof Array)) {
      console.log("[Rhombus] - input must be an integer array");
      return undefined;
    }

    var val = 0;
    var shftAmt = 7 * (vlv.length - 1);
    for (var i = 0; i < vlv.length - 1; i++) {
      val |= (vlv[i] & 0x7F) << shftAmt;
      shftAmt -= 7;
    }

    val |= vlv[vlv.length - 1];

    if (!isInteger(val)) {
      console.log("[Rhombus] - invalid input");
      return undefined;
    }

    return val;
  }

  // src: http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
  window.hsvToRgb = function(h, s, v) {
    var h_i = Math.floor(h * 6);
    var f = (h * 6) - h_i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    var r, g, b;

    if (h_i == 0) {
      r = v;
      g = t;
      b = p;
    }
    else if (h_i == 1) {
      r = q;
      g = v;
      b = p;
    }
    else if (h_i == 2) {
      r = p;
      g = v;
      b = t;
    }
    else if (h_i == 3) {
      r = p;
      g = q;
      b = v;
    }
    else if (h_i == 4) {
      r = t;
      g = p;
      b = v;
    }
    else if (h_i == 5) {
      r = v;
      g = p;
      b = q;
    }

    r = Math.floor(r*256);
    g = Math.floor(g*256);
    b = Math.floor(b*256);

    return (intToHexByte(r) + intToHexByte(g) + intToHexByte(b));
  }

  var h = Math.random();
  window.getRandomColor = function() {
    h += 0.618033988749895; // golden ratio conjugate
    h %= 1;

    return "#" + hsvToRgb(h, 0.5, 0.95).toUpperCase();
  }

  Rhombus.Util.clampMinMax = function(val, min, max) {
    return (val < min) ? min : (val > max) ? max : val;
  }

  Rhombus.Util.deepCopy = function(o) {
    return JSON.parse(JSON.stringify(o));
  }

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

  IdSlotContainer.prototype.moveSlot = function(oldIdx, newIdx) {
    if (oldIdx >= 0 && oldIdx < this._count && newIdx >= 0 && newIdx < this._count && oldIdx !== newIdx) {
      var obj = this._slots.splice(oldIdx, 1)[0];
      this._slots[newIdx].splice(newIdx, 0, obj);
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

  Rhombus._map.mergeInObject = function(base, toAdd, allowed) {
    if (typeof toAdd !== "object") {
      return;
    }

    if (typeof allowed !== "object") {
      return;
    }

    var addKeys = Object.keys(toAdd);
    for (var idx in addKeys) {
      var key = addKeys[idx];
      var value = toAdd[key];

      if (isNull(value) || notDefined(value)) {
        continue;
      }

      if (!(key in allowed)) {
        continue;
      }

      var allowedValue = allowed[key];
      var newIsObj = typeof value === "object";
      var allowedIsObj = typeof allowedValue === "object";
      if (newIsObj && allowedIsObj) {
        if (!(key in base)) {
          base[key] = {};
        }
        Rhombus._map.mergeInObject(base[key], value, allowedValue);
      } else {
        base[key] = value;
      }
    }
  };

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

  Rhombus._map.unnormalizedParams = function(params, unnormalizeMap) {
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
          if (isDefined(thisLevelMap)) {
            var entry = thisLevelMap[key];
            if (isDefined(entry) && isDefined(entry[0])) {
              var ctrXformer = entry[0];
              returnObj[key] = ctrXformer(value);
            }
          } else {
            returnObj[key] = value;
          }
        }
      }
      return returnObj;
    }

    return unnormalized(params, unnormalizeMap);
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
          if (notDefined(generated)) {
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
  };

  Rhombus._map.filterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "highpass", "bandpass", "lowshelf",
                         "highshelf", "peaking", "notch", "allpass"), rawDisplay, 0],
    "frequency" : [Rhombus._map.freqMapFn, hzDisplay, 1.0],
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
  };

})(this.Rhombus);

//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {

  function Port(node, slot) {
    this.node = node;
    this.slot = slot;
  }

  function numberifyOutputs(go) {
    for (var i = 0; i < go.length; i++) {
      var output = go[i];
      for (var j = 0; j < output.to.length; j++) {
        var port = output.to[j];
        port.node = +(port.node);
        port.slot = +(port.slot);
      }
    }
  }

  function numberifyInputs(gi) {
    for (var i = 0; i < gi.length; i++) {
      var input = gi[i];
      for (var j = 0; j < input.from.length; j++) {
        var port = input.from[j];
        port.node = +(port.node);
        port.slot = +(port.slot);
      }
    }
  }

  Rhombus.Util.numberifyOutputs = numberifyOutputs;
  Rhombus.Util.numberifyInputs = numberifyInputs;

  function graphSetup(audioIn, controlIn, audioOut, controlOut) {
    this._graphInputs = [];
    this._graphOutputs = [];

    for (var i = 0; i < audioIn; i++) {
      this._graphInputs.push({type: "audio", from: []});
    }
    for (var i = 0; i < controlIn; i++) {
      this._graphInputs.push({type: "control", from: []});
    }
    for (var i = 0; i < audioOut; i++) {
      this._graphOutputs.push({type: "audio", to: []});
    }
    for (var i = 0; i < controlOut; i++) {
      this._graphOutputs.push({type: "control", to: []});
    }
  }


  Rhombus._graphSetup = function(r) {

    function graphLookup(id) {
      var instr = r._song._instruments.getObjById(id);
      if (isDefined(instr)) {
        return instr;
      }
      var track = r._song._tracks.getObjById(id);
      if (isDefined(track)) {
        return track;
      }
      return r._song._effects[id];
    }
    r.graphLookup = graphLookup;

    function graphInputs() {
      function getRealNodes(input) {
        var newInput = {};
        newInput.type = input.type;
        newInput.from = input.from.map(function (port) {
          return new Port(graphLookup(port.node), port.slot);
        });
        return newInput;
      }

      return this._graphInputs.map(getRealNodes);
    }

    function graphOutputs() {
      function getRealNodes(output) {
        var newOutput = {};
        newOutput.type = output.type;
        newOutput.to = output.to.map(function (port) {
          return new Port(graphLookup(port.node), port.slot);
        });
        return newOutput;
      }

      return this._graphOutputs.map(getRealNodes);
    }

    function existsPathFrom(from, to) {
      function existsPathRecursive(a, b, seen) {
        if (a._id === b._id) {
          return true;
        }

        var newSeen = seen.slice(0);
        newSeen.push(a);

        var inAny = false;
        var outputs = a.graphOutputs();

        for (var outputIdx = 0; outputIdx < outputs.length; outputIdx++) {
          var output = outputs[outputIdx];
          for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
            var port = output.to[portIdx];
            if (newSeen.indexOf(port.node) !== -1) {
              continue;
            }
            inAny = inAny || existsPathRecursive(port.node, b, newSeen);
          }
        }

        return inAny;
      }

      return existsPathRecursive(from, to, []);
    }

    function connectionExists(a, output, b, input) {
      var ports = a._graphOutputs[output].to;
      for (var i = 0; i < ports.length; i++) {
        var port = ports[i];
        if (port.node === b._id && port.slot === input) {
          return true;
        }
      }
      return false;
    }

    function backwardsConnectionExists(a, output, b, input) {
      var ports = b._graphInputs[input].from;
      for (var i = 0; i < ports.length; i++) {
        var port = ports[i];
        if (port.node === a._id && port.slot === output) {
          return true;
        }
      }
      return false;
    }

    function graphConnect(output, b, bInput, internal) {
      if (output < 0 || output >= this._graphOutputs.length) {
        return false;
      }
      if (bInput < 0 || bInput >= b._graphInputs.length) {
        return false;
      }

      var outputObj = this._graphOutputs[output];
      var inputObj = b._graphInputs[bInput];
      if (outputObj.type !== inputObj.type) {
        return false;
      }

      if (existsPathFrom(b, this)) {
        return false;
      }

      if (connectionExists(this, output, b, bInput)) {
        return false;
      }

      if (!internal) {
        var that = this;
        r.Undo._addUndoAction(function() {
          that.graphDisconnect(output, b, bInput, true);
        });
      }

      outputObj.to.push(new Port(b._id, bInput));
      inputObj.from.push(new Port(this._id, output));

      this._internalGraphConnect(output, b, bInput);
      return true;
    };

    function graphDisconnect(output, b, bInput, internal) {
      if (output < 0 || output >= this._graphOutputs.length) {
        return false;
      }
      if (bInput < 0 || bInput >= b._graphInputs.length) {
        return false;
      }

      var outputObj = this._graphOutputs[output];
      var inputObj = b._graphInputs[bInput];

      var outputPortIdx = -1;
      var inputPortIdx = -1;
      for (var i = 0; i < outputObj.to.length; i++) {
        var port = outputObj.to[i];
        if (port.node === b._id && port.slot === bInput) {
          outputPortIdx = i;
          break;
        }
      }

      for (var i = 0; i < inputObj.from.length; i++) {
        var port = inputObj.from[i];
        if (port.node === this._id && port.slot === output) {
          inputPortIdx = i;
          break;
        }
      }

      if (outputPortIdx === -1 || inputPortIdx === -1) {
        return false;
      }

      if (!internal) {
        var that = this;
        r.Undo._addUndoAction(function() {
          that.graphConnect(output, b, bInput, true);
        });
      }

      outputObj.to.splice(outputPortIdx, 1);
      inputObj.from.splice(inputPortIdx, 1);

      this._internalGraphDisconnect(output, b, bInput);
    }

    function graphX() {
      if (notNumber(this._graphX)) {
        this._graphX = 0;
      }
      return this._graphX;
    }

    function setGraphX(x) {
      if (isNumber(x)) {
        this._graphX = x;
      }
    }

    function graphY() {
      if (notNumber(this._graphY)) {
        this._graphY = 0;
      }
      return this._graphY;
    }

    function setGraphY(y) {
      if (isNumber(y)) {
        this._graphY = y;
      }
    }

    function removeConnections() {
      var go = this.graphOutputs();
      for (var outputIdx = 0; outputIdx < go.length; outputIdx++) {
        var output = go[outputIdx];
        for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
          var port = output.to[portIdx];
          this.graphDisconnect(outputIdx, port.node, port.slot, true);
        }
      }
      var gi = this.graphInputs();
      for (var inputIdx = 0; inputIdx < gi.length; inputIdx++) {
        var input = gi[inputIdx];
        for (var portIdx = 0; portIdx < input.from.length; portIdx++) {
          var port = input.from[portIdx];
          port.node.graphDisconnect(port.slot, this, inputIdx, true);
        }
      }
    }

    function restoreConnections(go, gi) {
      for (var inputIdx = 0; inputIdx < gi.length; inputIdx++) {
        var input = gi[inputIdx];
        for (var portIdx = 0; portIdx < input.from.length; portIdx++) {
          var port = input.from[portIdx];
          port.node.graphConnect(port.slot, this, inputIdx, true);
        }
      }

      for (var outputIdx = 0; outputIdx < go.length; outputIdx++) {
        var output = go[outputIdx];
        for (var portIdx = 0; portIdx < output.to.length; portIdx++) {
          var port = output.to[portIdx];
          this.graphConnect(outputIdx, port.node, port.slot, true);
        }
      }
    }

    function isEffect() {
      return this._graphType === "effect";
    }

    function isInstrument() {
      return this._graphType === "instrument";
    }

    function isTrack() {
      return this._graphType === "track";
    }

    r._addGraphFunctions = function(ctr) {
      ctr.prototype._graphSetup = graphSetup;
      ctr.prototype.graphInputs = graphInputs;
      ctr.prototype.graphOutputs = graphOutputs;
      ctr.prototype.graphConnect = graphConnect;
      ctr.prototype.graphDisconnect = graphDisconnect;
      ctr.prototype.connectionExists = connectionExists;
      ctr.prototype._removeConnections = removeConnections;
      ctr.prototype._restoreConnections = restoreConnections;
      ctr.prototype.graphX = graphX;
      ctr.prototype.setGraphX = setGraphX;
      ctr.prototype.graphY = graphY;
      ctr.prototype.setGraphY = setGraphY;
      
      ctr.prototype.isEffect = isEffect;
      ctr.prototype.isInstrument = isInstrument;
      ctr.prototype.isTrack = isTrack;
    };

    r.getMaster = function() {
      var effects = r._song._effects;
      var effectIds = Object.keys(effects);
      for (var idIdx in effectIds) {
        var effect = effects[effectIds[idIdx]];
        if (effect.isMaster()) {
          return effect;
        }
      }
      return undefined;
    }

    r._toMaster = function(node) {
      var master = this.getMaster();

      if (notDefined(master)) {
        return;
      }

      // TODO: get these slots right
      node.graphConnect(0, master, 0, true);
    };

    r._importFixGraph = function() {
      var trackIds = this._song._tracks.objIds();
      var instrIds = this._song._instruments.objIds();
      var effIds = Object.keys(this._song._effects);
      var nodeIds = trackIds.concat(instrIds).concat(effIds);
      var nodes = nodeIds.map(graphLookup);

      nodes.forEach(function (node) {
        var gi = node.graphInputs();
        var go = node.graphOutputs();

        // First, verify the graph integrity.
        // If any half-connections exist, get rid of them.
        for (var outIdx = 0; outIdx < go.length; outIdx++) {
          var out = go[outIdx];
          for (var portIdx = 0; portIdx < out.to.length; portIdx++) {
            var port = out.to[portIdx];
            if (!backwardsConnectionExists(node, outIdx, port.node, port.slot)) {
              node._graphOutputs[outIdx].to.splice(portIdx, 1);
            }
          }
        }

        for (var inIdx = 0; inIdx < gi.length; inIdx++) {
          var inp = gi[inIdx];
          for (var portIdx = 0; portIdx < inp.from.length; portIdx++) {
            var port = inp.from[portIdx];
            if (!connectionExists(port.node, port.slot, node, inIdx)) {
              node._graphInputs[inIdx].from.splice(portIdx, 1);
            }
          }
        }

        // Now, actually do the connecting.
        for (var outIdx = 0; outIdx < go.length; outIdx++) {
          var out = go[outIdx];
          for (var portIdx = 0; portIdx < out.to.length; portIdx++) {
            var port = out.to[portIdx];
            node._internalGraphConnect(outIdx, port.node, port.slot);
          }
        }
      });
    };

    r.getNodeById = graphLookup;

  };
})(this.Rhombus);

//! rhombus.param.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._paramSetup = function(r) {

    r._addParamFunctions = function(ctr) {
      ctr.prototype._trackParams = trackParams;
      ctr.prototype.parameterCount = parameterCount;
      ctr.prototype.parameterName = parameterName;
      ctr.prototype.parameterDisplayString = parameterDisplayString;
      ctr.prototype.parameterDisplayStringByName = parameterDisplayStringByName;
      ctr.prototype.normalizedGet = normalizedGet;
      ctr.prototype.normalizedGetByName = normalizedGetByName;
      ctr.prototype.normalizedSet = normalizedSet;
      ctr.prototype.normalizedSetByName = normalizedSetByName;
      ctr.prototype.getInterface = getInterface;
      ctr.prototype.getControls = getControls;
      ctr.prototype.getParamMap = getParamMap;
    };

    function trackParams(params) {
      Rhombus._map.mergeInObject(this._currentParams, params, this._unnormalizeMap);
    }

    function parameterCount() {
      return Rhombus._map.subtreeCount(this._unnormalizeMap);
    }

    function parameterName(paramIdx) {
      var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
      if (typeof name !== "string") {
        return;
      }
      return name;
    }

    function parameterDisplayString(paramIdx) {
      return this.parameterDisplayStringByName(this.parameterName(paramIdx));
    }

    function parameterDisplayStringByName(paramName) {
      var pieces = paramName.split(":");

      var curValue = this._currentParams;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, curValue);
      var realObj = Rhombus._map.unnormalizedParams(setObj, this._unnormalizeMap);

      curValue = realObj;
      for (var i = 0; i < pieces.length; i++) {
        curValue = curValue[pieces[i]];
      }
      if (notDefined(curValue)) {
        return;
      }

      var displayValue = curValue;
      var disp = Rhombus._map.getDisplayFunctionByName(this._unnormalizeMap, paramName);
      return disp(displayValue);
    }

    function normalizedGet(paramIdx) {
      return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
    }

    function normalizedGetByName(paramName) {
      return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
    }

    function normalizedSet(paramIdx, paramValue) {
      paramValue = +paramValue;
      var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function normalizedSetByName(paramName, paramValue) {
      paramValue = +paramValue;
      var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
      if (typeof setObj !== "object") {
        return;
      }
      this._normalizedObjectSet(setObj);
    }

    function getInterface() {
      // create a container for the controls
      var div = document.createElement("div");

      // create controls for each of the node parameters
      for (var i = 0; i < this.parameterCount(); i++) {
        // paramter range and value stuff
        var value = this.normalizedGet(i);

        // control label
        div.appendChild(document.createTextNode(this.parameterName(i)));

        var ctrl = document.createElement("input");
        ctrl.setAttribute("id",     this.parameterName(i));
        ctrl.setAttribute("name",   this.parameterName(i));
        ctrl.setAttribute("class",  "newSlider");
        ctrl.setAttribute("type",   "range");
        ctrl.setAttribute("min",    0.0);
        ctrl.setAttribute("max",    1.0);
        ctrl.setAttribute("step",   0.01);
        ctrl.setAttribute("value",  value);

        div.appendChild(ctrl);
        div.appendChild(document.createElement("br"));
      }

      return div;
    }

    function getControls(controlHandler) {
      var controls = new Array();
      for (var i = 0; i < this.parameterCount(); i++) {
        controls.push( { id       : this.parameterName(i),
                         target   : this,
                         on       : "input",
                         callback : controlHandler } );
      }

      return controls;
    }

    function getParamMap() {
      var map = {};
      for (var i = 0; i < this.parameterCount(); i++) {
        var param = {
          "name"   : this.parameterName(i),
          "index"  : i,
          "target" : this
        };
        map[this.parameterName(i)] = param;
      }

      return map;
    };

  };
})(this.Rhombus);

//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._instrumentSetup = function(r) {

    var instMap = [
      [ "mono",  "PolySynth",   undefined        ],
      [ "samp",  "Drums",       "drums1"         ],
      [ "samp",  "808",         "drums2"         ],
      [ "samp",  "Flute",       "tron_flute"     ],
      [ "samp",  "Woodwinds",   "tron_woodwinds" ],
      [ "samp",  "Brass 01",    "tron_brass_01"  ],
      [ "samp",  "Guitar",      "tron_guitar"    ],
      [ "samp",  "Choir",       "tron_choir"     ],
      [ "samp",  "Cello",       "tron_cello"     ],
      [ "samp",  "Strings",     "tron_strings"   ],
      [ "samp",  "Violins",     "tron_violins"   ],
      [ "samp",  "Violins 02",  "tron_16vlns"    ],
      [ "am",    "AM Synth",    undefined        ],
      [ "fm",    "FM Synth",    undefined        ],
      [ "noise", "Noise Synth", undefined        ],
      [ "duo",   "Duo Synth",   undefined        ]
    ];

    r.instrumentTypes = function() {
      var types = [];
      for (var i = 0; i < instMap.length; i++) {
        types.push(instMap[i][0]);
      }
      return types;
    };

    r.instrumentDisplayNames = function() {
      var names = [];
      for (var i = 0; i < instMap.length; i++) {
        names.push(instMap[i][1]);
      }
      return names;
    };

    r.sampleSets = function() {
      var sets = [];
      for (var i = 0; i < instMap.length; i++) {
        sets.push(instMap[i][2]);
      }
      return sets;
    };

    r.addInstrument = function(type, json, idx, sampleSet) {
      var options, go, gi, id, graphX, graphY;
      if (isDefined(json)) {
        options = json._params;
        go = json._graphOutputs;
        gi = json._graphInputs;
        id = json._id;
        graphX = json._graphX;
        graphY = json._graphY;
      }

      function samplerOptionsFrom(options, set) {
        if (isDefined(options)) {
          options.sampleSet = set;
          return options;
        } else {
          return { sampleSet: set };
        }
      }

      var instr;

      // sampleSet determines the type of sampler....
      if (type === "samp") {
        if (notDefined(sampleSet)) {
          instr = new this._Sampler(samplerOptionsFrom(options, "drums1"), id);
        }
        else {
          instr = new this._Sampler(samplerOptionsFrom(options, sampleSet), id);
        }
      }
      else {
        instr = new this._ToneInstrument(type, options, id);
      }

      // TODO: get these slots right
      instr._graphSetup(0, 1, 1, 0);
      if (isNull(instr) || notDefined(instr)) {
        return;
      }

      instr.setGraphX(graphX);
      instr.setGraphY(graphY);

      if (isDefined(go)) {
        Rhombus.Util.numberifyOutputs(go);
        instr._graphOutputs = go;
      } else {
        r._toMaster(instr);
      }

      if (isDefined(gi)) {
        Rhombus.Util.numberifyInputs(gi);
        instr._graphInputs = gi;
      }

      var idToRemove = instr._id;
      r.Undo._addUndoAction(function() {
        r.removeInstrument(idToRemove, true);
      });
      this._song._instruments.addObj(instr, idx);

      instr._graphType = "instrument";

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

    r.removeInstrument = function(instrOrId, internal) {
      var id = inToId(instrOrId);
      if (id < 0) {
        return;
      }

      // exercise the nuclear option
      r.killAllNotes();

      var instr = r._song._instruments.getObjById(id);
      var slot = r._song._instruments.getSlotById(id);

      var go = Rhombus.Util.deepCopy(instr.graphOutputs());
      var gi = Rhombus.Util.deepCopy(instr.graphInputs());

      if (!internal) {
        r.Undo._addUndoAction(function() {
          r._song._instruments.addObj(instr, slot);
          instr._restoreConnections(go, gi);
        });
      }

      instr._removeConnections();
      r._song._instruments.removeId(id);
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

    ////////////////////////////////////////////////////////////////////////////
    // Preview Note Stuff
    ////////////////////////////////////////////////////////////////////////////

    // TODO: find a more suitable place for this stuff

    isTargetTrackDefined = function(rhomb) {
      var targetId  = rhomb._globalTarget;
      var targetTrk = rhomb._song._tracks.getObjBySlot(targetId);

      if (notDefined(targetTrk)) {
        console.log("[Rhombus] - target track is not defined");
        return false;
      }
      else {
        return true;
      }
    };

    // Maintain an array of the currently sounding preview notes
    var previewNotes = new Array();

    r.startPreviewNote = function(pitch, velocity) {

      if (notDefined(pitch) || !isInteger(pitch) || pitch < 0 || pitch > 127) {
        console.log("[Rhombus] - invalid preview note pitch");
        return;
      }

      var targetId  = this._globalTarget;
      var targetTrk = this._song._tracks.getObjBySlot(targetId);

      if (!isTargetTrackDefined(this)) {
        return;
      }

      if (notDefined(velocity) || velocity < 0 || velocity > 1) {
        velocity = 0.5;
      }

      var rtNote = new this.RtNote(pitch,
                                   velocity,
                                   Math.round(this.getPosTicks()),
                                   0,
                                   targetId);

      previewNotes.push(rtNote);

      var targets = this._song._tracks.getObjBySlot(targetId)._targets;
      for (var i = 0; i < targets.length; i++) {
        var inst = this._song._instruments.getObjById(targets[i]);
        if (isDefined(inst)) {
          inst.triggerAttack(rtNote._id, pitch, 0, velocity);
        }
      }

      if (!this.isPlaying() && this.getRecordEnabled()) {
        this.startPlayback();
        document.dispatchEvent(new CustomEvent("rhombus-start"));
      }
    };

    killRtNotes = function(noteIds, targets) {
      for (var i = 0; i < targets.length; i++) {
        var inst = r._song._instruments.getObjById(targets[i]);
        if (isDefined(inst)) {
          for (var j = 0; j < noteIds.length; j++) {
            inst.triggerRelease(noteIds[j], 0);
          }
        }
      }
    };

    r.stopPreviewNote = function(pitch) {
      if (!isTargetTrackDefined(this)) {
        return;
      }

      var curTicks = Math.round(this.getPosTicks());

      var deadNoteIds = [];

      // Kill all preview notes with the same pitch as the input pitch, since
      // there is no way to distinguish between them
      //
      // If record is enabled, add the finished notes to the record buffer
      for (var i = previewNotes.length - 1; i >=0; i--) {
        var rtNote = previewNotes[i];
        if (rtNote._pitch === pitch) {
          deadNoteIds.push(rtNote._id);

          // handle wrap-around notes by clamping at the loop end
          if (curTicks < rtNote._start) {
            rtNote._end = r.getLoopEnd();
          }
          else {
            rtNote._end = curTicks;
          }

          // enforce a minimum length of 5 ticks
          if (rtNote._end - rtNote._start < 5) {
            rtNote._end = rtNote._start + 5;
          }

          if (this.isPlaying() && this.getRecordEnabled()) {
            this.Record.addToBuffer(rtNote);
          }

          previewNotes.splice(i, 1);
        }
      }

      var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
      killRtNotes(deadNoteIds, targets);
    };

    r.killAllPreviewNotes = function() {
      if (!isTargetTrackDefined(this)) {
        return;
      }

      var deadNoteIds = [];
      while (previewNotes.length > 0) {
        var rtNote = previewNotes.pop();
        deadNoteIds.push(rtNote._id);
      }

      var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
      killRtNotes(deadNoteIds, targets);

      console.log("[Rhombus] - killed all preview notes");
    };
  };
})(this.Rhombus);

//! rhombus.instrument.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._samplerSetup = function(r) {

    function SuperToneSampler() {
      Tone.Sampler.apply(this, Array.prototype.slice.call(arguments));
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

      this._unnormalizeMap = samplerUnnormalizeMap;
      this._names = {};
      this.samples = {};
      this._triggered = {};
      this._currentParams = {};
      this._sampleSet = undefined;

      this._sampleSet = "drums1";
      if (isDefined(options) && isDefined(options.sampleSet)) {
        sampleSet = options.sampleSet;
      }
      this._sampleSet = sampleSet;

      var thisSampler = this;

      var finish = function() {
        var def = Rhombus._map.generateDefaultSetObj(samplerUnnormalizeMap);
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
    r._addParamFunctions(Sampler);
    r._addGraphFunctions(Sampler);
    r._addAudioNodeFunctions(Sampler);

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
      if (this._sampleSet.indexOf("drum") === -1) {
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
      }
      delete this._triggered[id];
    };

    Sampler.prototype.killAllNotes = function() {
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.triggerRelease();
      }
      this.triggered = {};
    };

    Sampler.prototype.toJSON = function() {
      var params = {
        "params": this._currentParams,
        "sampleSet": this._sampleSet
      };

      var go = this._graphOutputs;
      var gi = this._graphInputs;

      var jsonVersion = {
        "_id": this._id,
        "_type": "samp",
        "_sampleSet" : this._sampleSet,
        "_params": params,
        "_graphOutputs": go,
        "_graphInputs": gi,
        "_graphX": this._graphX,
        "_graphY": this._graphY
      };
      return jsonVersion;
    };

    var samplerUnnormalizeMap = {
      "volume" : [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 0.1],
      "playbackRate" : [Rhombus._map.mapExp(0.1, 10), Rhombus._map.rawDisplay, 0.5],
      "player" : {
        "loop" : [Rhombus._map.mapDiscrete(false, true), Rhombus._map.rawDisplay, 0]
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
      "filter" : Rhombus._map.filterMap
    };

    Sampler.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var that = this;
        var oldParams = this._currentParams;
        r.Undo._addUndoAction(function() {
          that._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);

      var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
      var samplerKeys = Object.keys(this.samples);
      for (var idx in samplerKeys) {
        var sampler = this.samples[samplerKeys[idx]];
        sampler.set(unnormalized);
      }
    };

    Sampler.prototype.displayName = function() {
      return "Sampler";
    };

    r._Sampler = Sampler;
  };
})(this.Rhombus);

//! rhombus.instrument.tone.js
//! authors: Spencer Phippen, Tim Grant
//!
//! Contains instrument definitions for instruments wrapped from Tone.
//!
//! license: MIT

(function(Rhombus) {
  Rhombus._wrappedInstrumentSetup = function(r) {

    var mono = Tone.MonoSynth;
    var am = Tone.AMSynth;
    var fm = Tone.FMSynth;
    var noise = Tone.NoiseSynth;
    var duo = Tone.DuoSynth;
    var typeMap = {
      "mono" : [mono, "Monophonic Synth"],
      "am"   : [am, "AM Synth"],
      "fm"   : [fm, "FM Synth"],
      "noise": [noise, "Noise Synth"],
      "duo"  : [duo, "DuoSynth"]
    };

    function ToneInstrument(type, options, id) {
      var ctr = typeMap[type][0];
      var displayName = typeMap[type][1];
      if (isNull(ctr) || notDefined(ctr)) {
        type = "mono";
        ctr = mono;
        displayName = "Monophonic Synth";
      }

      if (notDefined(id)) {
        r._newId(this);
      } else {
        r._setId(this, id);
      }

      this._type = type;
      this._displayName = displayName;
      this._unnormalizeMap = unnormalizeMaps[this._type];
      this._currentParams = {};
      this._triggered = {};

      Tone.PolySynth.call(this, undefined, ctr);
      var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
      this._normalizedObjectSet(def, true);
      this._normalizedObjectSet(options, true);
    }

    Tone.extend(ToneInstrument, Tone.PolySynth);
    r._addGraphFunctions(ToneInstrument);
    r._addParamFunctions(ToneInstrument);
    r._addAudioNodeFunctions(ToneInstrument);

    ToneInstrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
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

    ToneInstrument.prototype.triggerRelease = function(id, delay) {
      var tR = Tone.PolySynth.prototype.triggerRelease;
      var freq = this._triggered[id];
      if (delay > 0) {
        tR.call(this, freq, "+" + delay);
      } else {
        tR.call(this, freq);
      }
      delete this._triggered[id];
    };

    ToneInstrument.prototype.killAllNotes = function() {
      var freqs = [];
      for (var id in this._triggered) {
        freqs.push(this._triggered[id]);
      }
      Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
      this._triggered = {};
    };

    ToneInstrument.prototype.toJSON = function() {
      var go = this._graphOutputs;
      var gi = this._graphInputs;

      var jsonVersion = {
        "_id": this._id,
        "_type": this._type,
        "_params": this._currentParams,
        "_graphOutputs": go,
        "_graphInputs": gi,
        "_graphX": this._graphX,
        "_graphY": this._graphY
      };
      return jsonVersion;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // BEGIN ULTRAHAX
    ////////////////////////////////////////////////////////////////////////////////

    // ["Display Name", scale, isVisible, isDiscrete, isBipolar, offset]

    var paramMap = [
      ["Portamento",       1, false, false, false, 0.0],  // 00
      ["Volume",           4, true,  false, false, 0.0],  // 01
      ["Osc Type",         5, true,  true,  false, 0.0],  // 02
      ["Amp Attack",       1, true,  false, false, 0.0],  // 03
      ["Amp Decay",        1, true,  false, false, 0.0],  // 04
      ["Amp Sustain",      1, true,  false, false, 0.0],  // 05
      ["Amp Release",      1, true,  false, false, 0.0],  // 06
      ["Amp Exp",          1, false, false, false, 0.0],  // 07
      ["Filter Type",      1, false, false, false, 0.0],  // 08
      ["Filter Cutoff",    1, true,  false, false, 0.0],  // 09
      ["Filter Rolloff",   1, false, false, false, 0.0],  // 10
      ["Filter Resonance", 1, true,  false, false, 0.0],  // 11
      ["Filter Gain",      1, false, false, false, 0.0],  // 12
      ["Filter Attack",    1, true,  false, false, 0.0],  // 13
      ["Filter Decay",     1, true,  false, false, 0.0],  // 14
      ["Filter Sustain",   1, true,  false, false, 0.0],  // 15
      ["Filter Release",   1, true,  false, false, 0.0],  // 16
      ["Filter Min",       1, false, false, false, 0.0],  // 17
      ["Filter Mod",       2, true,  false, false, 0.5],  // 18
      ["Filter Exp",       1, false, false, false, 0.0],  // 19
      ["Osc Detune",      10, true,  false, true,  0.0]   // 20
    ];

    ToneInstrument.prototype.getToneParamMap = function() {
      var map = {};
      for (var i = 0; i < paramMap.length; i++) {
        var param = {
          "name"     : paramMap[i][0],
          "index"    : i,
          "scale"    : paramMap[i][1],
          "visible"  : paramMap[i][2],
          "discrete" : paramMap[i][3],
          "bipolar"  : paramMap[i][4],
          "offset"   : paramMap[i][5]
        };
        map[paramMap[i][0]] = param;
      }

      return map;
    };

    ToneInstrument.prototype.getToneControls = function (controlHandler) {
      var controls = new Array();
      for (var i = 0; i < paramMap.length; i++) {
        controls.push( { id       : paramMap[i][0],
                         target   : this._id,
                         on       : "input",
                         callback : controlHandler,
                         scale    : paramMap[i][1],
                         discrete : paramMap[i][3],
                         bipolar  : paramMap[i][4] } );
      }

      return controls;
    };

    ToneInstrument.prototype.getToneInterface = function() {

      // create a container for the controls
      var div = document.createElement("div");

      // create controls for each of the parameters in the map
      for (var i = 0; i < paramMap.length; i++) {
        var param = paramMap[i];

        // don't draw invisible controls
        if (!param[2]) {
          continue;
        }

        // paramter range and value stuff
        var value = this.normalizedGet(i) * param[1];
        var min = 0;
        var max = 1;
        var step = 0.01;

        // bi-polar controls
        if (param[4]) {
          min = -1;
          max = 1;
          step = (max - min) / 100;
          value = (this.normalizedGet(i) - 0.5) * param[1];
        }

        // discrete controls
        if (param[3]) {
          min = 0;
          max = param[1];
          step = 1;
        }

        //var form = document.createElement("form");
        //form.setAttribute("oninput", param[0] +"Val.value=" + param[0] + ".value");

        // control label
        div.appendChild(document.createTextNode(param[0]));

        var ctrl = document.createElement("input");
        ctrl.setAttribute("id",     param[0]);
        ctrl.setAttribute("name",   param[0]);
        ctrl.setAttribute("class",  "newSlider");
        ctrl.setAttribute("type",   "range");
        ctrl.setAttribute("min",    min);
        ctrl.setAttribute("max",    max);
        ctrl.setAttribute("step",   step);
        ctrl.setAttribute("value",  value);

        //var output = document.createElement("output");
        //output.setAttribute("id",    param[0] + "Val");
        //output.setAttribute("name",  param[0] + "Val");
        //output.setAttribute("value", value);

        //form.appendChild(output);
        //form.appendChild(ctrl);
        //div.appendChild(form);

        div.appendChild(ctrl);
        div.appendChild(document.createElement("br"));
      }

      return div;
    };

    ////////////////////////////////////////////////////////////////////////////////
    // END ULTRAHAX
    ////////////////////////////////////////////////////////////////////////////////

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

    ToneInstrument.prototype._normalizedObjectSet = function(params, internal) {
      if (notObject(params)) {
        return;
      }

      if (!internal) {
        var that = this;
        var oldParams = this._currentParams;
        r.Undo._addUndoAction(function() {
          that._normalizedObjectSet(oldParams, true);
        });
      }
      this._trackParams(params);
      var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
      this.set(unnormalized);
    };

    ToneInstrument.prototype.displayName = function() {
      return this._displayName;
    };

    r._ToneInstrument = ToneInstrument;
  };
})(this.Rhombus);

//! rhombus.effect.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * An effect in the audio graph.
 * @name Effect
 * @interface
 * @memberof Rhombus
 * @implements {Rhombus.GraphNode}
 */

/**
 * @returns {Array} An array of all the possible effect strings that can be passed into {@link Rhombus#addEffect}.
 */
Rhombus.prototype.effectTypes = function() {
  return ["dist", "filt", "eq", "dely", "comp", "gain", "bitc", "revb", "chor", "scpt"];
};

/**
 * @returns {Array} An array of the strings to display in the UI for each effect type, parallel with {@link Rhombus#effectTypes}.
 */
Rhombus.prototype.effectDisplayNames = function() {
  return ["Distortion", "Filter", "EQ", "Delay", "Compressor", "Gain", "Bitcrusher", "Reverb", "Chorus", "Script"];
};

/**
 * Adds an effect of the given type to the current song.
 * @param {String} type A type from the array returned from {@link Rhombus#effectTypes}.
 * @returns {Number} The id of the newly added effect
 */
Rhombus.prototype.addEffect = function(type, json) {
  function masterAdded(song) {
    var effs = song.getEffects();
    var effIds = Object.keys(song.getEffects());
    for (var i = 0; i < effIds.length; i++) {
      var effId = effIds[i];
      var eff = effs[effId];
      if (eff.isMaster()) {
        return true;
      }
    }
    return false;
  }

  var ctrMap = {
    "dist" : this._Distortion,
    "filt" : this._Filter,
    "eq"   : this._EQ,
    "dely" : this._Delay,
    "comp" : this._Compressor,
    "gain" : this._Gainer,
    "bitc" : this._BitCrusher,
    "revb" : this._Reverb,
    "chor" : this._Chorus,
    "scpt" : this._Script
  };

  var options, go, gi, id, graphX, graphY;
  if (isDefined(json)) {
    options = json._params;
    go = json._graphOutputs;
    gi = json._graphInputs;
    id = json._id;
    graphX = json._graphX;
    graphY = json._graphY;
  }

  var ctr;
  if (type === "mast") {
    if (masterAdded(this._song)) {
      return;
    }
    ctr = this._Master;
  } else {
    ctr = ctrMap[type];
  }

  if (notDefined(ctr)) {
    ctr = ctrMap["dist"];
  }

  var eff = new ctr();

  if (isNull(eff) || notDefined(eff)) {
    return;
  }

  eff.setGraphX(graphX);
  eff.setGraphY(graphY);

  if (isNull(id) || notDefined(id)) {
    this._newId(eff);
  } else {
    this._setId(eff, id);
  }

  eff._type = type;
  eff._currentParams = {};
  eff._trackParams(options);

  var def = Rhombus._map.generateDefaultSetObj(eff._unnormalizeMap);
  eff._normalizedObjectSet(def, true);
  eff._normalizedObjectSet(options, true);

  if (ctr === this._Master) {
    eff._graphSetup(1, 1, 0, 0);
  } else {
    eff._graphSetup(1, 1, 1, 0);
  }

  if (isDefined(go)) {
    Rhombus.Util.numberifyOutputs(go);
    eff._graphOutputs = go;
  }

  if (isDefined(gi)) {
    Rhombus.Util.numberifyInputs(gi);
    eff._graphInputs = gi;
  }

  var that = this;
  var effects = this._song._effects;
  this.Undo._addUndoAction(function() {
    delete effects[eff._id];
  });

  effects[eff._id] = eff;

  eff._graphType = "effect";

  return eff._id;
};

/**
 * Removes the effect with the given id from the current song.
 * The master effect cannot be removed.
 *
 * @param {Rhombus.Effect|Number} effectOrId The effect to remove, or its id.
 * @returns {Boolean} true if the effect was in the song, false otherwise
 */
Rhombus.prototype.removeEffect = function(effectOrId) {
  function inToId(effectOrId) {
    var id;
    if (typeof effectOrId === "object") {
      id = effectOrId._id;
    } else {
      id = +effectOrId;
    }
    return id;
  }

  var id = inToId(effectOrId);
  if (id < 0) {
    return;
  }

  var effect = this._song._effects[id];
  if (effect.isMaster()) {
    return;
  }

  var gi = Rhombus.Util.deepCopy(effect.graphInputs());
  var go = Rhombus.Util.deepCopy(effect.graphOutputs());
  this.Undo._addUndoAction(function() {
    this._song._effects[id] = effect;
    effect._restoreConnections(go, gi);
  });
  effect._removeConnections();
  delete this._song._effects[id];

  // exercise the nuclear option
  this.killAllNotes();
};

Rhombus.prototype._makeEffectMap = function(obj) {
  obj["dry/wet"] = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 1.0];
  obj["gain"] = [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0];
  return obj;
};

Rhombus.prototype._addEffectFunctions = function(ctr) {
  var rhombThis = this;
  function normalizedObjectSet(params, internal) {
    if (notObject(params)) {
      return;
    }

    if (!internal) {
      var that = this;
      var oldParams = this._currentParams;
      rhombThis.Undo._addUndoAction(function() {
        that._normalizedObjectSet(oldParams, true);
      });
    }
    this._trackParams(params);
    var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap);
    this.set(unnormalized);
  }

  /**
   * @returns {Boolean} true if this effect is the master effect, false otherwise.
   * @memberof Rhombus.Effect.prototype
   */
  function isMaster() {
    return false;
  }

  function toJSON(params) {
    var jsonVersion = {
      "_id": this._id,
      "_type": this._type,
      "_params": this._currentParams,
      "_graphOutputs": this._graphOutputs,
      "_graphInputs": this._graphInputs,
      "_graphX": this._graphX,
      "_graphY": this._graphY
    };
    return jsonVersion;
  }

  ctr.prototype._normalizedObjectSet = normalizedObjectSet;
  rhombThis._addParamFunctions(ctr);
  rhombThis._addGraphFunctions(ctr);
  rhombThis._addAudioNodeFunctions(ctr);
  ctr.prototype.toJSON = toJSON;
  ctr.prototype.isMaster = isMaster;

  // Swizzle out the set method for one that does gain.
  var oldSet = ctr.prototype.set;
  ctr.prototype.set = function(options) {
    oldSet.apply(this, arguments);
    if (isDefined(options)) {
      if (isDefined(options.gain)) {
        this.output.gain.value = options.gain;
      }

      if (isDefined(options["dry/wet"])) {
        this.setWet(options["dry/wet"]);
      }
    }
  };
};

//! rhombus.effect.tone.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {

  // http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
  function construct(ctr, args) {
    function F() {
      return ctr.apply(this, args);
    }
    F.prototype = ctr.prototype;
    return new F();
  }

  var rawDisplay = Rhombus._map.rawDisplay;
  var secondsDisplay = Rhombus._map.secondsDisplay;
  var dbDisplay = Rhombus._map.dbDisplay;

  Rhombus._wrappedEffectSetup = function(r) {

    // Distortion
    function dist() {
      Tone.Distortion.apply(this, arguments);
    }
    Tone.extend(dist, Tone.Distortion);
    r._addEffectFunctions(dist);
    r._Distortion = dist;

    dist.prototype._unnormalizeMap = r._makeEffectMap({
      "distortion" : [Rhombus._map.mapIdentity, rawDisplay, 0.4],
      "oversample" : [Rhombus._map.mapDiscrete("none", "2x", "4x"), rawDisplay, 0.0]
    });

    dist.prototype.displayName = function() {
      return "Distortion";
    };

    // BitCrusher
    function bitcrusher() {
      Tone.Effect.apply(this, arguments);
    }
    Tone.extend(bitcrusher, Tone.Effect);
    r._BitCrusher = bitcrusher;

    bitcrusher.prototype.set = function(options) {
      Tone.Effect.prototype.set.apply(this, arguments);

      if (isDefined(options) && isDefined(options.bits)) {
        if (isDefined(this._bitCrusher)) {
          this.effectSend.disconnect();
          this._bitCrusher.disconnect();
          this._bitCrusher = undefined;
        }
        this._bitCrusher = new Tone.BitCrusher({ bits: options.bits });
        this.connectEffect(this._bitCrusher);
      }
    };
    r._addEffectFunctions(bitcrusher);

    var bitValues = [];
    (function() {
      for (var i = 1; i <= 16; i++) {
        bitValues.push(i);
      }
    })();
    bitcrusher.prototype._unnormalizeMap = r._makeEffectMap({
      "bits" : [Rhombus._map.mapDiscrete.apply(this, bitValues), rawDisplay, 0.49]
    });

    bitcrusher.prototype.displayName = function() {
      return "Bitcrusher";
    };

    // Filter
    function filter() {
      Tone.Effect.call(this);
      this._filter = construct(Tone.Filter, arguments);
      this.connectEffect(this._filter);
    }
    Tone.extend(filter, Tone.Effect);
    r._Filter = filter;

    filter.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._filter.set.apply(this._filter, arguments);
    };
    r._addEffectFunctions(filter);

    filter.prototype._unnormalizeMap = r._makeEffectMap(Rhombus._map.filterMap);

    filter.prototype.displayName = function() {
      return "Filter";
    };

    filter.prototype.setAutomationValueAtTime = function(value, time) {
      var toSet = this._unnormalizeMap["frequency"][0](value);
      this._filter.frequency.setValueAtTime(toSet, time);
    };

    // EQ
    function eq() {
      Tone.Effect.call(this);
      this._eq = construct(Tone.EQ, arguments);
      this.connectEffect(this._eq);
    }
    Tone.extend(eq, Tone.Effect);
    r._EQ = eq;

    eq.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._eq.set.apply(this._eq, arguments);
    };
    r._addEffectFunctions(eq);

    var volumeMap = [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 1.0];
    eq.prototype._unnormalizeMap = r._makeEffectMap({
      "low" : volumeMap,
      "mid" : volumeMap,
      "high" : volumeMap,
      "lowFrequency" : [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.2],
      "highFrequency": [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.8]
    });

    eq.prototype.displayName = function() {
      return "EQ";
    };

    // Compressor
    function comp() {
      Tone.Effect.call(this);
      this._comp = construct(Tone.Compressor, arguments);
      this.connectEffect(this._comp);
    }
    Tone.extend(comp, Tone.Effect);
    r._Compressor = comp;

    comp.prototype.set = function() {
      Tone.Effect.prototype.set.apply(this, arguments);
      this._comp.set.apply(this._comp, arguments);
    };
    r._addEffectFunctions(comp);

    comp.prototype._unnormalizeMap = r._makeEffectMap({
      "attack" : [Rhombus._map.timeMapFn, secondsDisplay, 0.0],
      "release" : [Rhombus._map.timeMapFn, secondsDisplay, 0.0],
      "threshold" : [Rhombus._map.mapLog(-100, 0), dbDisplay, 0.3],
      "knee" : [Rhombus._map.mapLinear(0, 40), dbDisplay, 0.75],
      "ratio" : [Rhombus._map.mapLinear(1, 20), dbDisplay, 11.0/19.0]
    });

    comp.prototype.displayName = function() {
      return "Compressor";
    };

    // Gain
    function gain() {
      Tone.Effect.call(this);
      this.effectSend.connect(this.effectReturn);
    }
    Tone.extend(gain, Tone.Effect);
    r._Gainer = gain;
    r._addEffectFunctions(gain);

    gain.prototype._unnormalizeMap = r._makeEffectMap({});

    gain.prototype.displayName = function() {
      return "Gain";
    };

    // For feedback effects
    var feedbackMapSpec = [Rhombus._map.mapLinear(-1, 1), rawDisplay, 0.5];

    // Chorus
    function chorus() {
      Tone.Chorus.call(this);
    }
    Tone.extend(chorus, Tone.Chorus);
    r._addEffectFunctions(chorus);
    r._Chorus = chorus;

    chorus.prototype._unnormalizeMap = r._makeEffectMap({
      "rate" : [Rhombus._map.mapLinear(0, 20), Rhombus._map.hzDisplay, 2.0],
      "delayTime" : [Rhombus._map.timeMapFn, secondsDisplay, 0.1],
      "depth" : [Rhombus._map.mapLinear(0, 2), rawDisplay, 0.35],
      "type" : [Rhombus._map.mapDiscrete("sine", "square", "sawtooth", "triangle"), rawDisplay, 0.0],
      "feedback" : [Rhombus._map.mapLinear(-0.2, 0.2), rawDisplay, 0.5]
    });

    chorus.prototype.displayName = function() {
      return "Chorus";
    };

    // (Feedback) Delay
    function delay() {
      Tone.FeedbackDelay.call(this);
    }
    Tone.extend(delay, Tone.FeedbackDelay);
    r._addEffectFunctions(delay);
    r._Delay = delay;

    delay.prototype._unnormalizeMap = r._makeEffectMap({
      "delayTime" : [Rhombus._map.timeMapFn, secondsDisplay, 0.2],
      "feedback" : feedbackMapSpec
    });

    delay.prototype.displayName = function() {
      return "Delay";
    };

    // Reverb
    function reverb() {
      Tone.Freeverb.call(this);
    }
    Tone.extend(reverb, Tone.Freeverb);
    r._addEffectFunctions(reverb);
    r._Reverb = reverb;

    reverb.prototype._unnormalizeMap = r._makeEffectMap({
      "roomSize" : [Rhombus._map.mapLinear(0.001, 0.999), rawDisplay, 0.7],
      "dampening" : [Rhombus._map.mapLinear(0, 1), rawDisplay, 0.5]
    });

    reverb.prototype.displayName = function() {
      return "Reverb";
    };

  };
})(this.Rhombus);

//! rhombus.effect.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._masterSetup = function(r) {
    function Master() {
      Tone.Effect.call(this);
      this.effectSend.connect(this.effectReturn);
      this.setDry(1);
      this.toMaster();
    }
    Tone.extend(Master, Tone.Effect);
    r._addEffectFunctions(Master);
    Master.prototype.isMaster = function() { return true; };
    r._Master = Master;

    Master.prototype._unnormalizeMap = r._makeEffectMap({});

    Master.prototype.displayName = function() {
      return "Master";
    };

  };
})(this.Rhombus);

//! rhombus.effect.script.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {
  Rhombus._scriptEffectSetup = function(r) {

    function script() {
      Tone.Effect.call(this);

      var that = this;
      function inputSamples(chanIdx) {
        return that._inp.getChannelData(chanIdx);
      }

      function setProcessor(f) {
        that._processor = f;
      }

      function log() {
        console.log.apply(console, Array.prototype.slice.call(arguments, 0));
      }

      this._M = {
        channelCount: 0,
        inputSamples: inputSamples,
        setProcessor: setProcessor,
        log: log
      };

      this._tamedM = undefined;
      this._processor = undefined;

      var that = this;
      this._processorNode = r._ctx.createScriptProcessor(4096, 1, 1);
      this._processorNode.onaudioprocess = function(ae) {
        if (that._processor) {
          that._inp = ae.inputBuffer;
          that._M.channelCount = that._inp.numberOfChannels;
          var processed = that._processor();
          var out = ae.outputBuffer;
          for (var chan = 0; chan < out.numberOfChannels; chan++) {
            var processedData = processed[chan];
            var outData = out.getChannelData(chan);
            for (var samp = 0; samp < outData.length; samp++) {
              outData[samp] = processedData[samp];
            }
          }
        } else {
          // The default processor is just a pass-through.
          var inp = ae.inputBuffer;
          var out = ae.outputBuffer;
          for (var chan = 0; chan < inp.numberOfChannels; chan++) {
            var inpData = inp.getChannelData(chan);
            var outData = out.getChannelData(chan);
            for (var samp = 0; samp < inpData.length; samp++) {
              outData[samp] = inpData[samp];
            }
          }
        }
      };

      this.connectEffect(this._processorNode);
    }
    Tone.extend(script, Tone.Effect);
    r._Script = script;

    script.prototype.setCode = function(str) {
      var that = this;
      caja.load(undefined, undefined, function(frame) {
        if (!that._tamedM) {
          caja.markReadOnlyRecord(that._M);
          caja.markFunction(that._M.inputSamples);
          caja.markFunction(that._M.setProcessor);
          caja.markFunction(that._M.log);
          that._tamedM = caja.tame(that._M);
        }

        frame.code(undefined, 'text/javascript', str)
        .api({
          M: that._tamedM
        })
        .run();
      });
    };
    r._addEffectFunctions(script);

    script.prototype._unnormalizeMap = r._makeEffectMap({});
    script.prototype.displayName = function() {
      return "Script";
    };

  };
})(this.Rhombus);

//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

(function(Rhombus) {
  Rhombus._patternSetup = function(r) {

    r.NoteMap = function(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._avl = new AVL();
    };

    r.NoteMap.prototype = {
      addNote: function(note) {
        if (!(note instanceof r.Note)) {
          console.log("[Rhombus] - trying to add non-Note object to NoteMap");
          return false;
        }

        var key = Math.round(note.getStart());

        // don't allow multiple copies of the same note
        var elements = this._avl.search(key);
        for (var i = 0; i < elements.length; i++) {
          if (note === elements[i]) {
            console.log("[Rhombus] - trying to add duplicate Note to NoteMap");
            return false;
          }
        }

        if (isDefined(r._constraints.max_notes)) {
          if (r._song._noteCount >= r._constraints.max_notes) {
            return false;
          }
        }

        r._song._noteCount++;
        this._avl.insert(key, note);
        return true;
      },

      getNote: function(noteId) {
        var retNote = undefined;
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            if (note._id === noteId) {
              retNote = note;
              return;
            }
          }
        });

        return retNote;
      },

      getNotesAtTick: function(tick, lowPitch, highPitch) {
        if (notDefined(lowPitch) && notDefined(highPitch)) {
          var lowPitch  = 0;
          var highPitch = 127;
        }
        if (!isInteger(tick) || tick < 0) {
          return undefined;
        }

        if (!isInteger(lowPitch) || lowPitch < 0 || lowPitch > 127) {
          return undefined;
        }

        if (!isInteger(highPitch) || highPitch < 0 || highPitch > 127) {
          return undefined;
        }

        var retNotes = new Array();
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            var noteStart = note._start;
            var noteEnd   = noteStart + note._length;
            var notePitch = note._pitch;

            if ((noteStart <= tick) && (noteEnd >= tick) &&
                (notePitch >= lowPitch && notePitch <= highPitch)) {
              retNotes.push(note);
            }
          }
        });

        return retNotes;
      },

      removeNote: function(noteId, note) {
        if (notDefined(note) || !(note instanceof r.Note)) {
          note = this.getNote(noteId);
        }

        if (notDefined(note)) {
          console.log("[Rhombus] - note not found in NoteMap");
          return false;
        }

        var atStart = this._avl.search(note.getStart()).length;
        if (atStart > 0) {
          r._song._noteCount--;
          this._avl.delete(note.getStart(), note);
        }

        return true;
      },

      toJSON: function() {
        var jsonObj = {};
        this._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            jsonObj[note._id] = note;
          }
        });
        return jsonObj;
      }
    };

    r.AutomationEvent = function(time, value, id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._time = time;
      this._value = value;
    };

    r.AutomationEvent.prototype.getTime = function() {
      if (notInteger(this._time)) {
        this._time = 0;
      }
      return this._time;
    }

    r.AutomationEvent.prototype.getValue = function() {
      if (notNumber(this._value)) {
        this._value = 0.5;
      }
      return this._value;
    }

    r.Pattern = function(id) {
      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      // pattern metadata
      this._name = "Default Pattern Name";
      this._color = getRandomColor();
      this._selected = false;

      // pattern structure data
      this._length = 1920;
      this._noteMap = new r.NoteMap();

      this._automation = new AVL({ unique: true });
    };

    // TODO: make this interface a little more sanitary...
    //       It's a rather direct as-is
    r.Pattern.prototype = {

      getLength: function() {
        return this._length;
      },

      setLength: function(length) {
        if (isDefined(length) && length >= 0) {
          var oldLength = this._length;
          var that = this;
          r.Undo._addUndoAction(function() {
            that._length = oldLength;
          });
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

          var that = this;
          r.Undo._addUndoAction(function() {
            that._name = oldName;
          });

          return this._name;
        }
      },

      // TODO: validate this color stuff
      getColor: function() {
        return this._color;
      },

      setColor: function(color) {
        var oldColor = this._color;
        var that = this;
        r.Undo._addUndoAction(function() {
          that._color = oldColor;
        });
        this._color = color;
      },

      addNote: function(note) {
        this._noteMap.addNote(note);
        this.clearSelectedNotes();
      },

      addNotes: function(notes) {
        if (isDefined(notes)) {
          for (var i = 0; i < notes.length; i++) {
            this.addNote(notes[i]);
          }
        }
        this.clearSelectedNotes();
      },

      getNote: function(noteId) {
        return this._noteMap.getNote(noteId);
      },

      deleteNote: function(noteId, note) {
        if (notDefined(note)) {
          note = this._noteMap.getNote(noteId);
        }

        if (notDefined(note)) {
          console.log("[Rhombus] - note not found in pattern");
          return undefined;
        }

        this._noteMap.removeNote(noteId, note);
        return note;
      },

      deleteNotes: function(notes) {
        if (notDefined(notes)) {
          return;
        }
        for (var i = 0; i < notes.length; i++) {
          var note = notes[i];
          this.deleteNote(note._id, note);
        }
      },

      getAllNotes: function() {
        var notes = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            notes.push(node.data[i]);
          }
        });
        return notes;
      },

      getNotesInRange: function(start, end, ignoreEnds) {
        // only consider the start tick
        if (isDefined(ignoreEnds) && ignoreEnds === true) {
          return this._noteMap._avl.betweenBounds({ $lt: end, $gte: start });
        }

        // consider both start and end ticks
        var notes = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var srcStart = node.data[i]._start;
            var srcEnd   = srcStart + node.data[i]._length;

            if ((start < srcStart && end < srcStart) || (start > srcEnd)) {
              continue;
            }

            notes.push(node.data[i]);
          }
        });
        return notes;
      },

      getNotesAtTick: function(tick, lowPitch, highPitch, single) {
        var selection = this._noteMap.getNotesAtTick(tick, lowPitch, highPitch);
        if (notDefined(selection) || selection.length < 2 || notDefined(single) || !single) {
          return selection;
        }

        if (highPitch !== lowPitch) {
          console.log("[Rhombus] - single select only works for a single pitch");
          return undefined;
        }

        var shortest = undefined;
        var shortestLength = 1e6;

        for (var i = 0; i < selection.length; i++) {
          var note = selection[i];

          // ignore already-selected notes
          if (note._selected) {
            continue;
          }

          // find the shortest note
          if (note._length < shortestLength) {
            shortest = note;
            shortestLength = note._length;
          }
        }

        // if there is no shortest note, then all the notes at the tick are already selected
        if (notDefined(shortest)) {
          return selection;
        }
        else {
          return [shortest];
        }
      },

      getSelectedNotes: function() {
        var selected = new Array();
        this._noteMap._avl.executeOnEveryNode(function (node) {
          for (var i = 0; i < node.data.length; i++) {
            var note = node.data[i];
            if (note.getSelected()) {
              selected.push(note);
            }
          }
        });
        return selected;
      },

      clearSelectedNotes: function() {
        var selected = this.getSelectedNotes();
        for (var i = 0; i < selected.length; i++) {
          selected[i].deselect();
        }
      },

      getAutomationEventsInRange: function(start, end) {
        return this._automation.betweenBounds({ $lt: end, $gte: start });
      },

      toJSON: function() {
        var jsonObj = {
          "_id"      : this._id,
          "_name"    : this._name,
          "_color"   : this._color,
          "_length"  : this._length,
          "_noteMap" : this._noteMap.toJSON()
        };
        return jsonObj;
      }
    };

    // TODO: Note should probably have its own source file
    r.Note = function(pitch, start, length, velocity, id) {
      if (!isInteger(pitch) || pitch < 0 || pitch > 127) {
        console.log("[Rhombus] - Note pitch invalid: " + pitch);
        return undefined;
      }

      if (!isInteger(start) || start < 0) {
        console.log("[Rhombus] - Note start invalid: " + start);
        return undefined;
      }

      if (!isInteger(length) || length < 1) {
        console.log("[Rhombus] - Note length invalid: " + length);
        return undefined;
      }

      if (!isNumber(velocity) || velocity < 0 || velocity > 1) {
         console.log("[Rhombus] - Note velocity invalid: " + velocity);
        return undefined;
      }

      if (isDefined(id)) {
        r._setId(this, id);
      } else {
        r._newId(this);
      }

      this._pitch    = +pitch;
      this._start    = +start    || 0;
      this._length   = +length   || 0;
      this._velocity = +velocity || 0.5;
      this._selected = false;

      return this;
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
      },

      select: function() {
        return (this._selected = true);
      },

      deselect: function() {
        return (this._selected = false);
      },

      toggleSelect: function() {
        return (this._selected = !this._selected);
      },

      getSelected: function() {
        return this._selected;
      },

      setSelected: function(select) {
        return (this._selected = select);
      },

      toJSON: function() {
        var jsonObj = {
          "_id"       : this._id,
          "_pitch"    : this._pitch,
          "_start"    : this._start,
          "_length"   : this._length,
          "_velocity" : this._velocity
        };
        return jsonObj;
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
      this._selected = false;
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
        var that = this;
        r.Undo._addUndoAction(function() {
          that._start = oldStart;
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
        var that = this;
        r.Undo._addUndoAction(function() {
          that._length = oldLength;
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
      },

      // TODO: factor out shared selection code
      select: function() {
        return (this._selected = true);
      },

      deselect: function() {
        return (this._selected = false);
      },

      toggleSelect: function() {
        return (this._selected = !this._selected);
      },

      getSelected: function() {
        return this._selected;
      },

      setSelected: function(select) {
        return (this._selected = select);
      },

      toJSON: function() {
        var jsonObj = {
          "_id"     : this._id,
          "_trkId"  : this._trkId,
          "_ptnId"  : this._ptnId,
          "_start"  : this._start,
          "_length" : this._length,
        };
        return jsonObj;
      }
    };

    r.RtNote = function(pitch, velocity, start, end, target) {
      r._newRtId(this);
      this._pitch    = (isNaN(pitch) || notDefined(pitch)) ? 60 : pitch;
      this._velocity = +velocity || 0.5;
      this._start    = start || 0;
      this._end      = end || 0;
      this._target   = target;

      return this;
    };

    function Track(id) {
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
      this._targets = [];
      this._effectTargets = [];
      this._playingNotes = {};
      this._playlist = {};

      this._graphSetup(0, 0, 0, 1);
    };
    r._addGraphFunctions(Track);
    r.Track = Track;

    Track.prototype._graphType = "track";

    Track.prototype.setId = function(id) {
      this._id = id;
    };

    Track.prototype.getName = function() {
      return this._name;
    };

    Track.prototype.setName = function(name) {
      if (notDefined(name)) {
        return undefined;
      }
      else {
        var oldValue = this._name;
        this._name = name.toString();

        var that = this;
        r.Undo._addUndoAction(function() {
          that._name = oldValue;
        });

        return this._name;
      }
    };

    Track.prototype.getMute = function() {
      return this._mute;
    };

    Track.prototype.setMute = function(mute) {
      if (typeof mute !== "boolean") {
        return undefined;
      }

      var oldMute = this._mute;
      var that = this;
      r.Undo._addUndoAction(function() {
        that._mute = oldMute;
      });

      this._mute = mute;

      if (mute) {
        this.killAllNotes();
      }

      return mute;
    };

    Track.prototype.toggleMute = function() {
      return this.setMute(!this.getMute());
    };

    Track.prototype.getSolo = function() {
      return this._solo;
    };

    Track.prototype.setSolo = function(solo) {
      if (typeof solo !== "boolean") {
        return undefined;
      }

      var soloList = r._song._soloList;

      var oldSolo = this._solo;
      var oldSoloList = soloList.slice(0);
      var that = this;
      r.Undo._addUndoAction(function() {
        that._solo = oldSolo;
        r._song._soloList = oldSoloList;
      });

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
    };

    Track.prototype.toggleSolo =function() {
      return this.setSolo(!this.getSolo());
    };

    Track.prototype.getPlaylist =function() {
      return this._playlist;
    };

    // Determine if a playlist item exists that overlaps with the given range
    Track.prototype.checkOverlap = function(start, end) {
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
    };

    Track.prototype.addToPlaylist = function(ptnId, start, length) {
      // All arguments must be defined
      if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
        return undefined;
      }

      // ptnId myst belong to an existing pattern
      if (notDefined(r._song._patterns[ptnId])) {
        return undefined;
      }

      var newItem = new r.PlaylistItem(this._id, ptnId, start, length);
      this._playlist[newItem._id] = newItem;

      var that = this;
      r.Undo._addUndoAction(function() {
        delete that._playlist[newItem._id];
      });

      return newItem._id;

      // TODO: restore length checks
    };

    Track.prototype.getPlaylistItemById = function(id) {
      return this._playlist[id];
    };

    Track.prototype.getPlaylistItemByTick = function(tick) {
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
    };

    Track.prototype.removeFromPlaylist = function(itemId) {
      console.log("[Rhombus] - deleting playlist item " + itemId);
      itemId = itemId.toString();
      if (!(itemId in this._playlist)) {
        return undefined;
      } else {

        var obj = this._playlist[itemId];
        var that = this;
        r.Undo._addUndoAction(function() {
          that._playlist[itemId] = obj;
        });

        delete this._playlist[itemId.toString()];
      }

      return itemId;
    };

    Track.prototype.killAllNotes = function() {
      var playingNotes = this._playingNotes;

      for (var rtNoteId in playingNotes) {
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });
        delete playingNotes[rtNoteId];
      }
    };

    Track.prototype.toJSON = function() {
      var toReturn = {};
      toReturn._id = this._id;
      toReturn._name = this._name;
      toReturn._playlist = this._playlist;
      toReturn._graphOutputs = this._graphOutputs;
      toReturn._graphInputs = this._graphInputs;
      return toReturn;
    };

    Track.prototype.exportEvents = function() {
      var events = new AVL();
      var playlist = this._playlist;
      for (var itemId in playlist) {
        var srcPtn = r.getSong().getPatterns()[playlist[itemId]._ptnId];
        var notes = srcPtn.getAllNotes();

        for (var i = 0; i < notes.length; i++) {
          var note  = notes[i];
          var start = Math.round(note.getStart() + playlist[itemId]._start);
          var end   = start + Math.round(note.getLength());
          var vel   = Math.round(note.getVelocity() * 127);

          // insert the note-on and note-off events
          events.insert(start, [ 0x90, note.getPitch(), vel ]);
          events.insert(end,   [ 0x80, note.getPitch(), 64 ]);
        }
      }

      return events;
    };

    Track.prototype._internalGraphConnect = function(output, b, bInput) {
      if (b.isInstrument()) {
        this._targets.push(b._id);
      } else if (b.isEffect()) {
        this._effectTargets.push(b._id);
      }
    };

    Track.prototype._internalGraphDisconnect = function(output, b, bInput) {
      console.log("removing track connection");
      var toSearch;
      if (b.isInstrument()) {
        toSearch = this._targets;
      } else if (b.isEffect()) {
        toSearch = this._effectTargets;
      }

      if (notDefined(toSearch)) {
        return;
      }

      var idx = toSearch.indexOf(b._id);
      if (idx >= 0) {
        toSearch.splice(idx, 1);
      }
    };

  };
})(this.Rhombus);

//! rhombus.song.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * A class that represents a song loaded into the Rhombus engine.
 * Don't create one yourself.
 * @constructor
 */
Rhombus.Song = function(r) {
  this._r = r;

  // song metadata
  this._title  = "Default Song Title";
  this._artist = "Default Song Artist";
  this._length = 30720;
  this._bpm    = 120;

  this._loopStart = 0;
  this._loopEnd   = 1920;

  // song structure data
  if (isNumber(this._r._constraints.max_tracks)) {
    var maxTracks = Math.max(1, this._r._constraints.max_tracks);
    this._tracks = new Rhombus.Util.IdSlotContainer(maxTracks);
  } else {
    // 32 tracks, I guess.
    this._tracks = new Rhombus.Util.IdSlotContainer(32);
  }

  this._patterns = {};

  if (isNumber(this._r._constraints.max_instruments)) {
    var maxInstruments = Math.max(1, this._r._constraints.max_instruments);
    this._instruments = new Rhombus.Util.IdSlotContainer(maxInstruments);
  } else {
    // Once again, I guess 32.
    this._instruments = new Rhombus.Util.IdSlotContainer(32);
  }

  this._effects = {};
  this._soloList = [];

  this._curId = 0;

  // Tracks number of notes for constraint enforcement.
  this._noteCount = 0;
};

/**
 * @returns {String} The title of this song.
 */
Rhombus.Song.prototype.getTitle = function() {
  return this._title;
};

/**
 * @param {String} title The new title of this song.
 */
Rhombus.Song.prototype.setTitle = function(title) {
  this._title = title;
};

/**
 * @returns {String} The artist of this song.
 */
Rhombus.Song.prototype.getArtist = function() {
  return this._artist;
};

/**
 * @param {String} artist The new artist of this song.
 */
Rhombus.Song.prototype.setArtist = function(artist) {
  this._artist = artist;
};

/**
 * @returns {Number} The length of this Rhombus instance's current song, in ticks.
 */
Rhombus.Song.prototype.getLength = function() {
  return this._length;
};

/**
 * @param {Number} length The new length of the song, in ticks.
 */
Rhombus.Song.prototype.setLength = function(length) {
  if (isDefined(length) && length >= 480) {
    this._length = length;
    return length;
  }
  else {
    return undefined;
  }
};

/**
 * @returns {Object} A map from pattern ids to the {@link Rhombus.Pattern} objects in this song.
 */
Rhombus.Song.prototype.getPatterns = function() {
  return this._patterns;
};

/**
 * Adds the given pattern to this song.
 * @param {Rhombus.Pattern} pattern The pattern to add to this song.
 */
Rhombus.Song.prototype.addPattern = function(pattern) {
  if (notDefined(pattern)) {
    var pattern = new this._r.Pattern();
  }
  this._patterns[pattern._id] = pattern;

  var that = this;
  this._r.Undo._addUndoAction(function() {
    delete that._patterns[pattern._id];
  });

  return pattern._id;
};

/**
 * Removes the pattern with the given id from this song.
 * @param {Number} patternId The id of the pattern to delete.
 * @returns {Boolean} false if no pattern with the given ID existed, true otherwise.
 */
Rhombus.Song.prototype.deletePattern = function(ptnId) {
  console.log("[Rhombus] - deleting ptnId " + ptnId);
  var pattern = this._patterns[ptnId];

  if (notDefined(pattern)) {
    return false;
  }

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._patterns[ptnId] = pattern;
  });

  // TODO: make this action undoable
  // remove all instances of the deleted pattern from track playlists
  var tracks = this._tracks;
  tracks.objIds().forEach(function(trkId) {
    var track = tracks.getObjById(trkId);
    for (var itemId in track._playlist) {
      var item = track._playlist[itemId];
      if (+item._ptnId == +ptnId) {
        track.removeFromPlaylist(itemId);
      }
    }
  });

  delete this._patterns[ptnId];
  return true;
};

/**
 * Adds a new track to this song. May not succeed if you already have the maximum number of tracks.
 * @returns {Number|undefined} If the insertion succeeded, returns the new track id. Otherwise, returns undefined.
 */
Rhombus.Song.prototype.addTrack = function() {
  if (this._tracks.isFull()) {
    return undefined;
  }

  // Create a new Track object
  var track = new this._r.Track();
  this._tracks.addObj(track);

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._tracks.removeObj(track);
  });

  // Return the ID of the new Track
  return track._id;
};

/**
 * Removes the track with the given ID from this song.
 * @param {Number} trackID The ID of the track to delete.
 * @returns {Boolean} false if no track with the given ID existed, true otherwise.
 */
Rhombus.Song.prototype.deleteTrack = function(trkId) {
  trkId = +trkId;
  var track = this._tracks.getObjById(trkId);

  if (notDefined(track)) {
    return false;
  }

  track.killAllNotes();
  this._r.killAllPreviewNotes();

  // Remove the track from the solo list, if it's soloed
  var index = this._soloList.indexOf(track._id);
  if (index > -1) {
    this._soloList.splice(index, 1);
  }

  var slot = this._tracks.getSlotById(trkId);
  var track = this._tracks.removeId(trkId);

  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._tracks.addObj(track, slot);
  });

  track._removeConnections();

  return true;
};

/**
 * @returns {Rhombus.Util.IdSlotContainer} A slot container that holds the @{link Rhombus.Track} objects in this song.
 */
Rhombus.Song.prototype.getTracks = function() {
  return this._tracks;
};

/**
 * @returns {Rhombus.Util.IdSlotContainer} A slot container that holds the @{link Rhombus.Instrument} objects in this song.
 */
Rhombus.Song.prototype.getInstruments = function() {
  return this._instruments;
};

/**
 * @returns {Object} A map from effect ids to the {@link Rhombus.Effect} objects in this song.
 */
Rhombus.Song.prototype.getEffects = function() {
  return this._effects;
};

Rhombus.Song.prototype.toJSON = function() {
  return {
    "_artist"      : this._artist,
    "_bpm"         : this._bpm,
    "_curId"       : this._curId,
    "_effects"     : this._effects,
    "_instruments" : this._instruments,
    "_length"      : this._length,
    "_loopEnd"     : this._loopEnd,
    "_loopStart"   : this._loopStart,
    "_noteCount"   : this._noteCount,
    "_patterns"    : this._patterns,
    "_soloList"    : this._soloList,
    "_title"       : this._title,
    "_tracks"      : this._tracks
  };
};

/**
 * @returns {Number} The length of this Rhombus instance's current song, in seconds.
 */
Rhombus.prototype.getSongLengthSeconds = function() {
  return this.ticks2Seconds(this._song._length);
};

Rhombus.prototype.initSong = function() {
  this._song = new Rhombus.Song(this);
  // Add the master effect
  this.addEffect("mast");
};

/**
 * Import a previously-exported song back into this Rhombus instance.
 * @param {String} json The song to be imported. Should have been created with {@link Rhombus#exportSong}.
 */
Rhombus.prototype.importSong = function(json) {
  this._song = new Rhombus.Song(this);
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

    for (var noteId in noteMap) {
      var note = new this.Note(+noteMap[noteId]._pitch,
                               +noteMap[noteId]._start,
                               +noteMap[noteId]._length,
                               +noteMap[noteId]._velocity || 1,
                               +noteId);

      newPattern.addNote(note);
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

    var go = track._graphOutputs;
    var gi = track._graphInputs;
    if (isDefined(go)) {
      Rhombus.Util.numberifyOutputs(go);
      newTrack._graphOutputs = go;
    }
    if (isDefined(gi)) {
      Rhombus.Util.numberifyInputs(gi);
      newTrack._graphInputs = gi;
    }

    for (var itemId in playlist) {
      var item = playlist[itemId];
      var parentId = trkId;

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
    console.log("[Rhomb.importSong] - adding instrument of type " + inst._type);
    if (isDefined(inst._sampleSet)) {
      console.log("[Rhomb.importSong] - sample set is: " + inst._sampleSet);
    }
    this.addInstrument(inst._type, inst, +instIdIdx, inst._sampleSet);
  }

  for (var effId in effects) {
    var eff = effects[effId];
    this.addEffect(eff._type, eff);
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

  // Undo actions generated by the import or from
  // before the song import should not be used.
  this.Undo._clearUndoStack();
};

/**
 * An Array where the first entry is an AudioBuffer object for a sample, and the second is a String containing the name of the file the sample was loaded from.
 * @typedef {Array} Rhombus~sampleMapInfo
 */

/**
 * A callback used when resolving samples.
 * @callback Rhombus~sampleResolverCallback
 * @param {Object} sampleMap A map from MIDI pitches (0-127) to {@link Rhombus~sampleMapInfo} objects. Not all pitches must be mapped.
 */

/**
 * @typedef {Function} Rhombus~SampleResolver
 * @param {String} sampleSet The name of the sample set.
 * @param {Rhombus~sampleResolverCallback} callback The callback to be executed with the samples.
 */

/**
 * Provides a function responsible for loading sample sets in Rhombus.
 *
 * Whenever a sampler instrument is created, it has a sample set, represented as a String.
 * A list of sample sets supported by the library is returned by {@link Rhombus#sampleSets}.
 * The job of the sample resolver is to turn those strings into a map from MIDI pitches (0-127)
 * to Web Audio AudioBuffer objects. See the demos folder in the [GitHub repo]{@link https://github.com/soundsplosion/Rhombus} for an example implementation.
 *
 * @param {Rhombus~SampleResolver} resolver The function used to resolve samples.
 */
Rhombus.prototype.setSampleResolver = function(resolver) {
  this._sampleResolver = resolver;
};

/**
 * @returns {String} A JSON version of the song suitable for importing with {@link Rhombus#importSong}.
 */
Rhombus.prototype.exportSong = function() {
  this._song._curId = this.getCurId();
  return JSON.stringify(this._song);
};

/**
 * @returns {Rhombus.Song} The current song of this Rhombus instance.
 */
Rhombus.prototype.getSong = function() {
  return this._song;
};

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

        var elapsedNotes = [];

        // Schedule note-offs for notes playing on the current track.
        // Do this before scheduling note-ons to prevent back-to-back notes from
        // interfering with each other.
        for (var rtNoteId in playingNotes) {
          var rtNote = playingNotes[rtNoteId];
          var end = rtNote._end;

          if (end <= scheduleEndTime) {
            var delay = end - curTime;

            elapsedNotes.push([rtNote._id, delay]);

            delete playingNotes[rtNoteId];
          }
        }

        for (var i = 0; i < track._targets.length; i++) {
          var inst = r._song._instruments.getObjById(track._targets[i]);
          for (var j = 0; j < elapsedNotes.length; j++) {
            inst.triggerRelease(elapsedNotes[j][0], elapsedNotes[j][1]);
          }
        }

        // Determine how soloing and muting affect this track
        var inactive = track._mute || (r._song._soloList.length > 0 && !track._solo);

        if (!r.isPlaying() || inactive) {
          track.killAllNotes();
        }
        else {
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

            var begin = scheduleStart - itemStart;
            var end   = begin + (scheduleEnd - scheduleStart);
            var pattern = r.getSong().getPatterns()[ptnId];

            // Schedule automation events
            var events = pattern.getAutomationEventsInRange(begin, end);
            for (var i = 0; i < events.length; i++) {
              var ev = events[i];

              // Lots of this copied from the note loop below...

              var time = ev.getTime() + itemStart;

              if (!loopOverride && r.getLoopEnabled() && start < loopStart) {
                continue;
              }

              if (start >= itemEnd) {
                continue;
              }

              var delay = r.ticks2Seconds(time) - curPos;
              var realTime = curTime + delay + startTime;

              track._targets.forEach(function(id) {
                var instr = r.graphLookup(id);
                instr._setAutomationValueAtTime(ev.getValue(), realTime);
              });
              track._effectTargets.forEach(function(id) {
                var eff = r.graphLookup(id);
                eff._setAutomationValueAtTime(ev.getValue(), realTime);
              });
            }

            // Schedule notes
            var notes = pattern.getNotesInRange(begin, end, true);

            for (var i = 0; i < notes.length; i++) {
              var note  = notes[i];
              var start = note.getStart() + itemStart;

              // prevent notes from before the loop start from triggering
              if (!loopOverride && r.getLoopEnabled() && start < loopStart) {
                continue;
              }

              // prevent other spurious note triggers
              if (start >= itemEnd) {
                continue;
              }

              var delay = r.ticks2Seconds(start) - curPos;

              var noteStartTime = curTime + delay;
              var endTime = noteStartTime + r.ticks2Seconds(note._length);

              var rtNote = new r.RtNote(note.getPitch(),
                                        note.getVelocity(),
                                        noteStartTime,
                                        endTime,
                                        track._id);

              playingNotes[rtNote._id] = rtNote;

              for (var targetIdx = 0; targetIdx < track._targets.length; targetIdx++) {
                var instrument = r._song._instruments.getObjById(track._targets[targetIdx]);
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

      var oldBpm = this._song._bpm;
      var that = this;
      r.Undo._addUndoAction(function() {
        that.setBpm(oldBpm);
      });

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
      var that = this;
      that._song._tracks.objIds().forEach(function(trkId) {
        var track = that._song._tracks.getObjById(trkId);
        var playingNotes = track._playingNotes;

        for (var rtNoteId in playingNotes) {
          that._song._instruments.objIds().forEach(function(instId) {
            that._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
          });
          delete playingNotes[rtNoteId];
        }
      });
    };

    r.panic = function() {
      this.killAllNotes();
      this.killAllPreviewNotes();
    };

    r.startPlayback = function() {
      if (this._disposed || playing) {
        return;
      }

      // Flush any notes that might be lingering
      lastScheduled = roundTick(this.seconds2Ticks(time), 15);
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
      if (this._disposed || !playing) {
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

    r.getPosTicks = function() {
      var ticks = r.seconds2Ticks(r.getPosition());
      if (r.getLoopEnabled() && ticks < 0) {
        ticks = r.getLoopEnd() + ticks;
      }
      return ticks;
    };

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
      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(note._id);
      });

      return r._song._patterns[ptnId].addNote(note);
    };

    // Inserts an array of notes into an existing pattern, with the start
    // times offset by the given amount
    //
    // The anticipated use case is inserting recorded notes, in which case
    // the offset would typically be a negative value (since all patterns start
    // at tick 0 internally)
    r.Edit.insertNotes = function(notes, ptnId, offset) {
      offset = (isDefined(offset)) ? offset : 0;
      var ptn = r._song._patterns[ptnId];

      // Even though the notes are modified below,
      // the slice is a shallow copy so the notes
      // passed to deleteNotes in the undo action
      // are the proper, modified versions.
      var notesCopy = notes.slice(0);
      r.Undo._addUndoAction(function() {
        ptn.deleteNotes(notesCopy);
      });

      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        if (isDefined(note)) {
          note._start = note._start + offset;
          ptn.addNote(note);
        }
      }
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    r.Edit.deleteNotes = function(notes, ptnId) {
      r._song._patterns[ptnId].deleteNotes(notes);
      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNotes(notes);
      });
    };

    r.Edit.changeNoteTime = function(noteId, start, length, ptnId) {

      if (start < 0 || length < 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId]._noteMap.getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldStart = note._start;
      var oldLength = note._length;

      r._song._patterns[ptnId].deleteNote(noteId, note);
      note._start = start;
      note._length = length;
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(noteId, note);
        note._start = oldStart;
        note._length = oldLength;
        r._song._patterns[ptnId].addNote(note);
      });

      return noteId;
    };

    r.Edit.changeNotePitch = function(noteId, pitch, ptnId) {
      // TODO: put checks on the input arguments
      var note = r._song._patterns[ptnId].getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldPitch = note._pitch;
      r.Undo._addUndoAction(function() {
        note._pitch = oldPitch;
      });

      if (pitch !== note.getPitch()) {
        r._song._instruments.objIds().forEach(function(instId) {
          r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
        });

        note._pitch = pitch;
      }

      // Could return anything here...
      return noteId;
    };

    r.Edit.updateNote = function(noteId, pitch, start, length, velocity, ptnId) {

      if (start < 0 || length < 1 || velocity < 0 || velocity > 1) {
        return undefined;
      }

      var note = r._song._patterns[ptnId].getNote(noteId);

      if (notDefined(note)) {
        return undefined;
      }

      var oldPitch    = note._pitch;
      var oldStart    = note._start;
      var oldLength   = note._length;
      var oldVelocity = note._velocity;

      r._song._patterns[ptnId].deleteNote(noteId, note);
      note._pitch    = pitch;
      note._start    = start;
      note._length   = length;
      note._velocity = velocity;
      r._song._patterns[ptnId].addNote(note);

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].deleteNote(noteId, note);
        note._pitch    = oldPitch;
        note._start    = oldStart;
        note._length   = oldLength;
        note._velocity = oldVelocity;
        r._song._patterns[ptnId].addNote(note);
      });

      return noteId;
    };

    r.Edit.updateVelocities = function(notes, velocity, onlySelected) {
      if (notDefined(velocity) || !isNumber(velocity) || velocity < 0 || velocity > 1) {
        console.log("[Rhombus.Edit] - invalid velocity");
        return false;
      }

      if (notDefined(onlySelected) || typeof onlySelected !== "boolean") {
        console.log("[Rhombus.Edit] - onlySelected must be of type Boolean");
        return false;
      }

      var oldVelocities = new Array(notes.length);

      for (var i = 0; i < notes.length; i++) {
        oldVelocities[i] = notes[i]._velocity;
        if (onlySelected && !notes[i]._selected) {
          continue;
        }
        notes[i]._velocity = velocity;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._velocity = oldVelocities[i];
        }
      });

      return true;
    };

    r.Edit.isValidTranslation = function(notes, pitchOffset, timeOffset) {
      for (i = 0; i < notes.length; i++) {
        var dstPitch = notes[i]._pitch + pitchOffset;
        var dstStart = notes[i]._start + timeOffset;

        // validate the translations
        if (dstPitch > 127 || dstPitch < 0 || dstStart < 0) {
          return false;
        }
      }

      return true;
    };

    r.Edit.translateNotes = function(ptnId, notes, pitchOffset, timeOffset) {
      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit] - pattern is not defined");
        return false;
      }

      var newValues = new Array(notes.length);
      var oldValues = new Array(notes.length);

      var maxPitch = 0;
      var minPitch = 127;
      var minStart = 1e6;

      // pre-compute and validate the translations before applying them
      for (var i = 0; i < notes.length; i++) {
        var dstPitch = notes[i]._pitch + pitchOffset;
        var dstStart = notes[i]._start + timeOffset;

        maxPitch = (dstPitch > maxPitch) ? dstPitch : maxPitch;
        minPitch = (dstPitch < minPitch) ? dstPitch : minPitch;
        minStart = (dstStart < minStart) ? dstStart : minStart;

        newValues[i] = [dstPitch, dstStart];
        oldValues[i] = [notes[i]._pitch, notes[i]._start];
      }

      var pitchDiff = 0;
      if (maxPitch > 127) {
        pitchDiff = 127 - maxPitch;
      }
      else if (minPitch < 0) {
        pitchDiff = -minPitch;
      }

      var startDiff = 0;
      if (minStart < 0) {
        startDiff = -minStart;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          ptn._noteMap._avl.delete(notes[i]._start, notes[i]);
          notes[i]._pitch = oldValues[i][0];
          notes[i]._start = oldValues[i][1];
          ptn._noteMap._avl.insert(notes[i]._start, notes[i]);
        }
      });

      // apply the translations
      for (var i = 0; i < notes.length; i++) {
        ptn._noteMap._avl.delete(notes[i]._start, notes[i]);
        notes[i]._pitch = newValues[i][0] + pitchDiff;
        notes[i]._start = newValues[i][1] + startDiff;
        ptn._noteMap._avl.insert(notes[i]._start, notes[i]);
      }

      return true;
    };

    r.Edit.offsetNoteLengths = function(ptnId, notes, lengthOffset, minLength) {
      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit.offsetNoteLengths] - pattern is not defined");
        return false;
      }

      // if no minimum is specified, use 30 ticks (64th note)
      if (notDefined(minLength)) {
        minLength = 30;
      }

      var newValues = new Array(notes.length);
      var oldValues = new Array(notes.length);

      // pre-compute the changes before applying them (maybe validate eventually)
      for (var i = 0; i < notes.length; i++) {
        var dstLength = notes[i]._length + lengthOffset;

        // don't resize notes to smaller than the minimum
        dstLength = (dstLength < minLength) ? minLength : dstLength;

        newValues[i] = dstLength;
        oldValues[i] = notes[i]._length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      // apply the changes
      for (var i = 0; i < notes.length; i++) {
        notes[i]._length = newValues[i];
      }

      return true;
    };

    r.Edit.setNoteLengths = function(ptnId, notes, length) {
      // make sure the new length is valid
      if (notDefined(length) || !isInteger(length) || length < 0) {
        console.log("[Rhombus.Edit.setNoteLengths] - length is not valid");
      }

      var ptn = r._song._patterns[ptnId];
      if (notDefined(ptn)) {
        console.log("[Rhombus.Edit.setNoteLengths] - pattern is not defined");
        return false;
      }

      var oldValues = new Array(notes.length);

      // cache the old lengths and apply the changes
      for (var i = 0; i < notes.length; i++) {
        oldValues[i] = notes[i]._length;
        notes[i]._length = length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      return true;
    };

    function findEventInArray(id, eventArray) {
      for (var i = 0; i < eventArray.length; i++) {
        if (eventArray[i]._id === id) {
          return eventArray[i];
        }
      }
      return undefined;
    }

    function findEventInAVL(id, avl) {
      var theEvent;
      avl.executeOnEveryNode(function(node) {
        for (var i = 0; i < node.data.length; i++) {
          var ev = node.data[i];
          if (ev._id === id) {
            theEvent = ev;
            return;
          }
        }
      });
      return theEvent;
    }

    r.Edit.insertAutomationEvent = function(time, value, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atThatTime = pattern._automation.search(time);
      if (atThatTime.length > 0) {
        return false;
      }

      pattern._automation.insert(time, new r.AutomationEvent(time, value));

      /*
      r.Undo._addUndoAction(function() {
        pattern._automation.delete(time);
      });
      */

      return true;
    };

    r.Edit.deleteAutomationEvent = function(time, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atTime = pattern._automation.search(time);
      if (atTime.length === 0) {
        return false;
      }

      pattern._automation.delete(time);
      return true;
    };

    r.Edit.deleteAutomationEventById = function(eventId, ptnId, internal) {
      var pattern = r._song._patterns[ptnId];

      var theEvent = findEventInAVL(eventId, pattern._automation);
      if (notDefined(theEvent)) {
        return false;
      }

      /*
      if (!internal) {
        r.Undo._addUndoAction(function() {
          pattern._automation.insert(time, theEvent);
        });
      }
      */

      pattern._automation.delete(theEvent.getTime());
      return true;
    };

    r.Edit.deleteAutomationEventsInRange = function(start, end, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var events = pattern.getAutomationEventsInRange(start, end);
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        r.Edit.deleteAutomationEventById(ev._id, ptnId, true);
      }

      /*
      r.Undo._addUndoAction(function() {
        for (var i = 0; i < events.length; i++) {
          var ev = events[i];
          pattern._automation.insert(ev.getTime(), ev);
        }
      });
      */
    }

    r.Edit.insertOrEditAutomationEvent = function(time, value, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var atThatTime = pattern._automation.search(time);
      if (atThatTime.length == 0) {
        return r.Edit.insertAutomationEvent(time, value, ptnId);
      }

      var theEvent = atThatTime[0];
      var oldValue = theEvent._value;

      /*
      r.Undo._addUndoAction(function() {
        theEvent._value = oldValue;
      });
      */

      theEvent._value = value;
      return true;
    };

    r.Edit.changeAutomationEventValue = function(eventId, newValue, ptnId) {
      var pattern = r._song._patterns[ptnId];
      var theEvent = findEventInAVL(eventId, pattern._automation);
      if (notDefined(theEvent)) {
        return false;
      }

      /*
      var oldValue = theEvent._value;
      r.Undo._addUndoAction(function() {
        theEvent._value = oldValue;
      });
      */

      theEvent._value = newValue;
      return true;
    };

    // Makes a copy of the source pattern and adds it to the song's pattern set.
    r.Edit.copyPattern = function(ptnId) {
      var srcPtn = r._song._patterns[ptnId];

      if (notDefined(srcPtn)) {
        return undefined;
      }

      var dstPtn = new r.Pattern();

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
          var dstNote = new r.Note(srcNote._pitch,
                                 srcNote._start,
                                 srcNote._length,
                                 srcNote._velocity);

          dstPtn.addNote(dstNote);
        }
      });

      dstPtn.setName(srcPtn.getName() + "-copy");

      r.Undo._addUndoAction(function() {
        delete r._song._patterns[dstPtn._id];
      });

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

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
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
      });

      // Uniquify the new pattern names (somewhat)
      dstL.setName(srcPtn.getName() + "-A");
      dstR.setName(srcPtn.getName() + "-B");

      var lId = dstL._id;
      var rId = dstR._id;
      r.Undo._addUndoAction(function() {
        delete r._song._patterns[lId];
        delete r._song._patterns[rId];
      });

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

      var notes = srcPtn.getNotesInRange(start, end, false);
      for (var i = notes.length - 1; i >= 0; i--) {
        var srcPitch = notes[i]._pitch;
        if (srcPitch > highNote || srcPitch < lowNote) {
          notes.splice(i, 1);
        }
      }

      // TODO: decide if we should return undefined if there are no matching notes
      return notes;
    };

    r.Edit.quantizeNotes = function(ptnId, notes, quantize, doEnds) {
      var srcPtn = r._song._patterns[ptnId];
      if (notDefined(srcPtn) || !isInteger(quantize)) {
        console.log("[Rhomb.Edit] - srcPtn is not defined");
        return undefined;
      }

      var oldNotes = notes.slice();

      var oldStarts  = new Array(notes.length);
      var oldLengths = new Array(notes.length);

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < oldNotes.length; i++) {
          var note = oldNotes[i];
          srcPtn.deleteNote(note._id, note);
          note._start = oldStarts[i];
          note._length = oldLengths[i];
          srcPtn.addNote(note);
        }
      });

      for (var i = 0; i < notes.length; i++) {
        var srcNote = notes[i];

        srcPtn.deleteNote(srcNote._id, srcNote);

        oldStarts[i]  = srcNote._start;
        oldLengths[i] = srcNote._length;

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

        srcPtn.addNote(srcNote);
      }
    };
  };
})(this.Rhombus);

//! rhombus.undo.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

/**
 * A class for managing undo functionality on a Rhombus instance.
 * Don't create one yourself.
 * @constructor
 */
Rhombus.Undo = function() {
  this._stackSize = 20;
  this._undoStack = [];
};

Rhombus.Undo.prototype._addUndoAction = function(f) {
  var insertIndex = this._undoStack.length;
  if (this._undoStack.length == this._stackSize) {
    this._undoStack.shift();
    insertIndex -= 1;
  }
  this._undoStack[insertIndex] = f;
};

Rhombus.Undo.prototype._clearUndoStack = function() {
  this._undoStack = [];
};

/** Returns true if there are actions to undo. */
/** @returns {Boolean} true if there are actions to undo. */
Rhombus.Undo.prototype.canUndo = function() {
  return this._undoStack.length > 0;
};

/**
 * Executes the most recent undo action, changing Rhombus state.
 * This call can drastically change the song state in Rhombus, so make sure
 * to refresh any data you need to (i.e. everything).
 */
Rhombus.Undo.prototype.doUndo = function() {
  if (this.canUndo()) {
    var action = this._undoStack.pop();
    action();
  }
};

//! rhombus.record.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._recordSetup = function(r) {
    r.Record = {};

    r._recordBuffer = new r.Pattern();

    r._recordEnabled = false;

    r.getRecordEnabled = function() {
      return this._recordEnabled;
    };

    r.setRecordEnabled = function(enabled) {
      if (typeof enabled === "boolean") {
        document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
        return this._recordEnabled = enabled;
      }
    };

    // Adds an RtNote with the given parameters to the record buffer
    r.Record.addToBuffer = function(rtNote) {
      if (isDefined(rtNote)) {

        var note = new r.Note(rtNote._pitch,
                              Math.round(rtNote._start),
                              Math.round(rtNote._end - rtNote._start),
                              rtNote._velocity);

        if (isDefined(note)) {
          r._recordBuffer.addNote(note);
        }
        else {
          console.log("[Rhombus.Record] - note is undefined");
        }
      }
      else {
        console.log("[Rhombus.Record] - rtNote is undefined");
      }
    };

    // Dumps the buffer of recorded RtNotes as a Note array, most probably
    // to be inserted into a new or existing pattern
    r.Record.dumpBuffer = function() {
      if (r._recordBuffer.length < 1) {
        return undefined;
      }

      return r._recordBuffer.getAllNotes();
    }

    r.Record.clearBuffer = function() {
      r._recordBuffer.deleteNotes(r._recordBuffer.getAllNotes());
    };
  };
})(this.Rhombus);

//! rhombus.effect.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function(Rhombus) {
  Rhombus._midiSetup = function(r) {
    r.Midi = {};

    // MIDI access object
    r._midi = null;
    r._inputMap = {};

    // Returns a MIDI Type 1 header chunk based on the current song
    r.Midi.makeHeaderChunk = function() {
      var arr = new Uint8Array(14);

      // ['M', 'T', 'r', 'k'] header
      arr.set([77, 84, 104, 100], 0);

      // number of data bytes in chunk
      arr.set(intToBytes(6), 4);

      // specify Type 1 format
      arr.set(intToBytes(1).slice(2), 8);

      // specify the number of tracks
      arr.set(intToBytes(r.getSong().getTracks().length()).slice(2), 10);

      // specify the timebase resolution
      arr.set(intToBytes(480).slice(2), 12);

      return arr;
    };

    // Exports the current song structure to a raw byte array in Type 1 MIDI format
    // Only the note data is exported, no tempo or time signature information
    r.Midi.getRawMidi = function() {
      // render each Rhombus track to a MIDI track chunk
      var mTrks    = [];
      var numBytes = 0;
      r._song._tracks.objIds().forEach(function(trkId) {
        var track = r._song._tracks.getObjById(trkId);
        var trkChunk = r.Midi.eventsToMTrk(track.exportEvents());
        mTrks.push(trkChunk);
        numBytes += trkChunk.length;
      });

      var header = r.Midi.makeHeaderChunk();

      // allocate the byte array
      var rawMidi = new Uint8Array(header.length + numBytes);

      // set the file header
      rawMidi.set(header, 0);

      // insert each track chunk at the appropriate offset
      var offset = header.length;
      for (var i = 0; i < mTrks.length; i++) {
        rawMidi.set(mTrks[i], offset);
        offset += mTrks[i].length;
      }

      return rawMidi;
    };

    // Passes the raw MIDI dump to any interested parties (e.g., the front-end)
    r.Midi.exportSong = function() {
      var rawMidi = r.Midi.getRawMidi();
      document.dispatchEvent(new CustomEvent("rhombus-exportmidi", {"detail": rawMidi}));
    };

    // Converts a list of track events to a MIDI Track Chunk
    r.Midi.eventsToMTrk = function(events) {
      var header = [ 77, 84, 114, 107 ];  // 'M' 'T' 'r' 'k'
      var body   = [ ];

      var lastStep = 0;
      events.executeOnEveryNode(function (node) {
        if (notDefined(node.key)) {
          console.log("[Rhombus.MIDI - node is not defined");
          return undefined;
        }

        var delta = node.key - lastStep;
        lastStep = node.key;
        for (var i = 0; i < node.data.length; i++) {
          body = body.concat(intToVlv(delta));
          body = body.concat(node.data[i]);
          delta = 0;
        }
      });

      // set the chunk size
      header = header.concat(intToBytes(body.length));

      // append the body
      header = header.concat(body);

      var trkChunk = new Uint8Array(header.length);
      for (var i = 0; i < header.length; i++) {
        trkChunk[i] = header[i];
      }

      return trkChunk;
    };

    function printMidiMessage(event) {
      var str = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
      for (var i=0; i<event.data.length; i++) {
        str += "0x" + event.data[i].toString(16) + " ";
      }
      console.log(str);
    }

    function onMidiMessage(event) {

      // silently ignore active sense messages
      if (event.data[0] === 0xFE) {
        return;
      }

      // only handle well-formed notes for now (don't worry about running status, etc.)
      if (event.data.length !== 3) {
        console.log("[MidiIn] - ignoring MIDI message");
        return;
      }
      // parse the message bytes
      var cmd   = event.data[0] & 0xF0;
      var chan  = event.data[0] & 0x0F;
      var pitch = event.data[1];
      var vel   = event.data[2];

      // check for note-off messages
      if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
        console.log("[MidiIn] - Note-Off, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
        r.stopPreviewNote(pitch);
      }

      // check for note-on messages
      else if (cmd === 0x90 && vel > 0) {
        vel /= 127;
        console.log("[MidiIn] - Note-On, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
        r.startPreviewNote(pitch, vel);
      }

      // don't worry about other message types for now
    }

    function mapMidiInputs(midi) {
      r._inputMap = {};
      var it = midi.inputs.entries();
      for (var entry = it.next(); !entry.done; entry = it.next()) {
        var value = entry.value;
        console.log("[MidiIn] - mapping entry " + value[0]);
        r._inputMap[value[0]] = value[1];
        value[1].onmidimessage = onMidiMessage;
      }
    }

    function onMidiSuccess(midiAccess) {
      console.log("[Rhombus] - MIDI Access Successful");
      r._midi = midiAccess;
      mapMidiInputs(r._midi);
    }

    function onMidiFailure(msg) {
      console.log( "Failed to get MIDI access - " + msg );
    }

    r.getMidiAccess = function() {
      r._midi = null;
      if (typeof navigator.requestMIDIAccess !== "undefined") {
        navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);
      }
    };

    r.enableMidi = function() {
      this.getMidiAccess();
    };
  };
})(this.Rhombus);

//! rhombus.audionode.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
(function (Rhombus) {

  // Code shared between instruments and nodes.

  Rhombus._audioNodeSetup = function(r) {

    function internalGraphConnect(output, b, bInput) {
      // TODO: use the slots when connecting
      var type = this._graphOutputs[output].type;
      if (type === "audio") {
        this.connect(b);
      } else if (type === "control") {
        // TODO: implement control routing
      }
    }

    function internalGraphDisconnect(output, b, bInput) {
      // TODO: use the slots when disconnecting
      var type = this._graphOutputs[output].type;
      if (type === "audio") {
        // TODO: this should be replaced in such a way that we
        // don't break all the outgoing connections every time we
        // disconnect from one thing. Put gain nodes in the middle
        // or something.
        console.log("removing audio connection");
        this.disconnect();
        var that = this;
        this._graphOutputs[output].to.forEach(function(port) {
          that.connect(r.graphLookup(port.node));
        });
      } else if (type === "control") {
        // TODO: implement control routing
        console.log("removing control connection");
      }
      else {
        console.log("removing unknown connection");
      }
    }

    // The default implementation changes volume.
    // Specific instruments and effects can handle this their own way.
    function setAutomationValueAtTime(value, time) {
      if (this.isInstrument() || this.isEffect()) {
        this.output.gain.setValueAtTime(value, time);
      }
    }

    r._addAudioNodeFunctions = function(ctr) {
      ctr.prototype._internalGraphConnect = internalGraphConnect;
      ctr.prototype._internalGraphDisconnect = internalGraphDisconnect;
      ctr.prototype._setAutomationValueAtTime = setAutomationValueAtTime;
    };

  };
})(this.Rhombus);
