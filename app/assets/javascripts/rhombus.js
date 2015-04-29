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

  /**
   * @member {Rhombus.Midi}
   */
  this.Midi = new Rhombus.Midi(this);

  /**
   * @member {Rhombus.Undo}
   */
  this.Undo = new Rhombus.Undo();

  /**
   * @member {Rhombus.Record}
   */
  this.Record = new Rhombus.Record(this);

  Rhombus._timeSetup(this);
  Rhombus._editSetup(this);

  this.initSong();
};

Object.defineProperty(Rhombus, '_ctx', {
  get: function() {
    return Tone.context;
  }
});

/** Makes this Rhombus instance unusable and releases references to resources. */
Rhombus.prototype.dispose = function() {
  this.disconnectFromCtxOut();
  this._disposed = true;
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

Rhombus.prototype.disconnectFromCtxOut = function() {
  var master = this.getMaster();
  master.disconnect(Rhombus._ctx.destination);
};

//! rhombus.audionode.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

// Code shared between instruments and nodes.

Rhombus._addAudioNodeFunctions = function(ctr) {
  function internalGraphConnect(output, b, bInput) {
    // TODO: use the slots when connecting
    var type = this._graphOutputs[output].type;
    if (type === "audio") {
      this.connect(b);
    } else if (type === "control") {
      // TODO: implement control routing
    }
  }
  ctr.prototype._internalGraphConnect = internalGraphConnect;

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
        that.connect(that._r.graphLookup(port.node));
      });
    } else if (type === "control") {
      // TODO: implement control routing
      console.log("removing control connection");
    }
    else {
      console.log("removing unknown connection");
    }
  }
  ctr.prototype._internalGraphDisconnect = internalGraphDisconnect;

  // The default implementation changes volume.
  // Specific instruments and effects can handle this their own way.
  function setAutomationValueAtTime(value, time) {
    if (this.isInstrument() || this.isEffect()) {
      this.output.gain.setValueAtTime(value, time);
    }
  }
  ctr.prototype._setAutomationValueAtTime = setAutomationValueAtTime;

  function getAutomationModulatedValue(base, automation) {
    var delta = this._currentParams.automation.depth * 2.0 * (automation - 0.5);
    var preClamp = base + delta;
    if (preClamp < 0.0) {
      preClamp = 0.0;
    } else if (preClamp > 1.0) {
      preClamp = 1.0;
    }
    return preClamp;
  }

  ctr.prototype._getAutomationModulatedValue = getAutomationModulatedValue;
};

Rhombus._makeAudioNodeMap = function(obj) {
  var newObj = {};
  for (var key in obj) {
    newObj[key] = obj[key];
  }
  newObj.automation = {};
  newObj.automation.depth = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 0];
  return newObj;
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

  Rhombus._map.unnormalizedParams = function(params, unnormalizeMap, useAliases) {
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
              var setKey;
              if (useAliases && isDefined(entry[3])) {
                setKey = entry[3];
              } else {
                setKey = key;
              }

              var ctrXformer = entry[0];
              returnObj[setKey] = ctrXformer(value);
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
  Rhombus._map.timeMapFn = Rhombus._map.mapExp(0.001, 10);
  Rhombus._map.shortTimeMapFn = Rhombus._map.mapExp(0.05, 1);
  Rhombus._map.freqMapFn = Rhombus._map.mapExp(1, 22100);
  Rhombus._map.cutoffMapFn = Rhombus._map.mapExp(25, 22100);
  Rhombus._map.lowFreqMapFn = Rhombus._map.mapExp(1, 100);
  Rhombus._map.exponentMapFn = Rhombus._map.mapExp(0.1, 10);
  Rhombus._map.harmMapFn = Rhombus._map.mapLinear(-2000, 2000);

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
    "attack"   : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,   secondsDisplay, 0.25],
    "sustain"  : [Rhombus._map.mapIdentity, rawDisplay,     1.0],
    "release"  : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
  };

  Rhombus._map.synthFilterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "bandpass", "highpass", "notch"),
              rawDisplay, 0],
    "cutoff" : [Rhombus._map.cutoffMapFn, hzDisplay, 1.0, "frequency"],
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterMap = {
    "type" : [Rhombus._map.mapDiscrete("lowpass", "bandpass", "highpass", "notch",
                                       "lowshelf", "highshelf", "peaking"), rawDisplay, 0],
    "cutoff" : [Rhombus._map.cutoffMapFn, hzDisplay, 1.0, "frequency"],
    "Q" : [Rhombus._map.mapLinear(1, 15), rawDisplay, 0],
    "gain" : [Rhombus._map.mapIdentity, rawDisplay, 0]
  };

  Rhombus._map.filterEnvelopeMap = {
    "attack"   : [Rhombus._map.timeMapFn,   secondsDisplay, 0.0],
    "decay"    : [Rhombus._map.timeMapFn,   secondsDisplay, 0.5],
    "sustain"  : [Rhombus._map.mapIdentity, rawDisplay,     0.0],
    "release"  : [Rhombus._map.timeMapFn,   secondsDisplay, 0.25],
    "min"      : [Rhombus._map.cutoffMapFn, hzDisplay,      0.0],
    "max"      : [Rhombus._map.cutoffMapFn, hzDisplay,      0.0],
  };

})(this.Rhombus);

//! rhombus.graph.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._makePort = function(node, slot) {
  var toRet = {};
  toRet.node = node;
  toRet.slot = slot;
  return toRet;
};

Rhombus.Util.numberifyOutputs = function(go) {
  for (var i = 0; i < go.length; i++) {
    var output = go[i];
    for (var j = 0; j < output.to.length; j++) {
      var port = output.to[j];
      port.node = +(port.node);
      port.slot = +(port.slot);
    }
  }
};

Rhombus.Util.numberifyInputs = function(gi) {
  for (var i = 0; i < gi.length; i++) {
    var input = gi[i];
    for (var j = 0; j < input.from.length; j++) {
      var port = input.from[j];
      port.node = +(port.node);
      port.slot = +(port.slot);
    }
  }
};

Rhombus.prototype.graphLookup = function(id) {
  var instr = this._song._instruments.getObjById(id);
  if (isDefined(instr)) {
    return instr;
  }
  var track = this._song._tracks.getObjById(id);
  if (isDefined(track)) {
    return track;
  }
  return this._song._effects[id];
}

Rhombus._addGraphFunctions = function(ctr) {
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
  ctr.prototype._graphSetup = graphSetup;


  function graphInputs() {
    var that = this;
    function getRealNodes(input) {
      var newInput = {};
      newInput.type = input.type;
      newInput.from = input.from.map(function (port) {
        return Rhombus._makePort(that._r.graphLookup(port.node), port.slot);
      });

      // Remove any connections where the node doesn't actually exist.
      for (var i = 0; i < newInput.from.length;) {
        var realNode = newInput.from[i].node;
        if (notDefined(realNode)) {
          input.from.splice(i, 1);
          newInput.from.splice(i, 1);
        } else {
          i++;
        }
      }
      return newInput;
    }

    return this._graphInputs.map(getRealNodes);
  }
  ctr.prototype.graphInputs = graphInputs;

  function graphOutputs() {
    var that = this;
    function getRealNodes(output) {
      var newOutput = {};
      newOutput.type = output.type;
      newOutput.to = output.to.map(function (port) {
        return Rhombus._makePort(that._r.graphLookup(port.node), port.slot);
      });

      // Remove any connections where the node doesn't actually exist.
      for (var i = 0; i < newOutput.to.length;) {
        var realNode = newOutput.to[i].node;
        if (notDefined(realNode)) {
          output.to.splice(i, 1);
          newOutput.to.splice(i, 1);
        } else {
          i++;
        }
      }
      return newOutput;
    }

    return this._graphOutputs.map(getRealNodes);
  }
  ctr.prototype.graphOutputs = graphOutputs;

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

    if (this.connectionExists(this, output, b, bInput)) {
      return false;
    }

    if (!internal) {
      var that = this;
      this._r.Undo._addUndoAction(function() {
        that.graphDisconnect(output, b, bInput, true);
      });
    }

    outputObj.to.push(Rhombus._makePort(b._id, bInput));
    inputObj.from.push(Rhombus._makePort(this._id, output));

    this._internalGraphConnect(output, b, bInput);
    return true;
  };
  ctr.prototype.graphConnect = graphConnect;

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
      this._r.Undo._addUndoAction(function() {
        that.graphConnect(output, b, bInput, true);
      });
    }

    outputObj.to.splice(outputPortIdx, 1);
    inputObj.from.splice(inputPortIdx, 1);

    this._internalGraphDisconnect(output, b, bInput);
  }
  ctr.prototype.graphDisconnect = graphDisconnect;

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
  ctr.prototype.connectionExists = connectionExists;

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
  ctr.prototype._removeConnections = removeConnections;
  ctr.prototype._restoreConnections = restoreConnections;

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
  ctr.prototype.graphX = graphX;
  ctr.prototype.setGraphX = setGraphX;
  ctr.prototype.graphY = graphY;
  ctr.prototype.setGraphY = setGraphY;
  

  function isEffect() {
    return this._graphType === "effect";
  }
  ctr.prototype.isEffect = isEffect;

  function isInstrument() {
    return this._graphType === "instrument";
  }
  ctr.prototype.isInstrument = isInstrument;

  function isTrack() {
    return this._graphType === "track";
  }
  ctr.prototype.isTrack = isTrack;
};

Rhombus.prototype.getMaster = function() {
  var effects = this._song._effects;
  var effectIds = Object.keys(effects);
  for (var idIdx in effectIds) {
    var effect = effects[effectIds[idIdx]];
    if (effect.isMaster()) {
      return effect;
    }
  }
  return undefined;
};

Rhombus.prototype._toMaster = function(node) {
  var master = this.getMaster();

  if (notDefined(master)) {
    return;
  }

  node.graphConnect(0, master, 0, true);
};

Rhombus.prototype._importFixGraph = function() {
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

  var trackIds = this._song._tracks.objIds();
  var instrIds = this._song._instruments.objIds();
  var effIds = Object.keys(this._song._effects);
  var nodeIds = trackIds.concat(instrIds).concat(effIds);

  var that = this;
  var nodes = nodeIds.map(function(id) {
    return that.graphLookup(id);
  });

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
        if (!port.node.connectionExists(port.node, port.slot, node, inIdx)) {
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

Rhombus.prototype.getNodeById = Rhombus.prototype.graphLookup;

//! rhombus.param.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._addParamFunctions = function(ctr) {
  function trackParams(params) {
    Rhombus._map.mergeInObject(this._currentParams, params, this._unnormalizeMap);
  }
  ctr.prototype._trackParams = trackParams;

  function parameterCount() {
    return Rhombus._map.subtreeCount(this._unnormalizeMap);
  }
  ctr.prototype.parameterCount = parameterCount;

  function parameterName(paramIdx) {
    var name = Rhombus._map.getParameterName(this._unnormalizeMap, paramIdx);
    if (typeof name !== "string") {
      return;
    }
    return name;
  }
  ctr.prototype.parameterName = parameterName;

  function parameterDisplayString(paramIdx) {
    return this.parameterDisplayStringByName(this.parameterName(paramIdx));
  }
  ctr.prototype.parameterDisplayString = parameterDisplayString;

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
    var realObj = Rhombus._map.unnormalizedParams(setObj, this._unnormalizeMap, false);

    curValue = realObj;
    for (var i = 0; i < pieces.length; i++) {
      curValue = curValue[pieces[i]];
    }
    if (notDefined(curValue)) {
      return;
    }

    var displayValue = curValue;

    if (isNumber(curValue)) {
      displayValue = Math.round(curValue * 1000) / 1000;
    }

    var disp = Rhombus._map.getDisplayFunctionByName(this._unnormalizeMap, paramName);
    return disp(displayValue);
  }
  ctr.prototype.parameterDisplayStringByName = parameterDisplayStringByName;

  function normalizedGet(paramIdx) {
    return Rhombus._map.getParameterValue(this._currentParams, paramIdx);
  }
  ctr.prototype.normalizedGet = normalizedGet;

  function normalizedGetByName(paramName) {
    return Rhombus._map.getParameterValueByName(this._currentParams, paramName);
  }
  ctr.prototype.normalizedGetByName = normalizedGetByName;

  function normalizedSet(paramIdx, paramValue) {
    paramValue = +paramValue;
    var setObj = Rhombus._map.generateSetObject(this._unnormalizeMap, paramIdx, paramValue);
    if (typeof setObj !== "object") {
      return;
    }
    this._normalizedObjectSet(setObj);
  }
  ctr.prototype.normalizedSet = normalizedSet;

  function normalizedSetByName(paramName, paramValue) {
    paramValue = +paramValue;
    var setObj = Rhombus._map.generateSetObjectByName(this._unnormalizeMap, paramName, paramValue);
    if (typeof setObj !== "object") {
      return;
    }
    this._normalizedObjectSet(setObj);
  }
  ctr.prototype.normalizedSetByName = normalizedSetByName;

  function getInterface() {
    // create a container for the controls
    var div = document.createElement("div");

    var newLevel = false;
    var levelString = "";

    // create controls for each of the node parameters
    for (var i = 0; i < this.parameterCount(); i++) {
      // paramter range and value stuff
      var value = this.normalizedGet(i);

      // tokenize the parameter name
      var paramName = this.parameterName(i);
      var tokens = paramName.split(":");

      // create header labels for each parameter group
      if (tokens.length > 1) {
        if (levelString !== tokens[0]) {
          // keep track of the top-level parameter group
          levelString = tokens[0];

          // create a container for the group label
          var levelDiv = document.createElement("div");
          var label = document.createTextNode(tokens[0].toUpperCase());

          // style the label
          levelDiv.style.textAlign = "center";
          levelDiv.appendChild(document.createElement("b"));

          // append the elements
          levelDiv.appendChild(document.createElement("br"));
          levelDiv.appendChild(label);
          levelDiv.appendChild(document.createElement("br"));
          div.appendChild(levelDiv);
        }
      }

      // control label
      div.appendChild(document.createTextNode(tokens[tokens.length - 1]));

      var ctrl = document.createElement("input");
      ctrl.setAttribute("id",     paramName);
      ctrl.setAttribute("name",   paramName);
      ctrl.setAttribute("class",  "newSlider");
      ctrl.setAttribute("type",   "range");
      ctrl.setAttribute("min",    0.0);
      ctrl.setAttribute("max",    1.0);
      ctrl.setAttribute("step",   0.01);
      ctrl.setAttribute("value",  value);

      div.appendChild(ctrl);

      var valueSpan = document.createElement("span");
      valueSpan.setAttribute("class", "valueSpan");
      valueSpan.setAttribute("name",  "paramValue_" + i);
      valueSpan.setAttribute("id",    "paramValue_" + i);
      valueSpan.innerHTML = this.parameterDisplayString(i);
      div.appendChild(valueSpan);

      div.appendChild(document.createElement("br"));
    }

    if (this._type === "scpt") {
      var button = document.createElement("input");
      button.setAttribute("id", "codeButton");
      button.setAttribute("name", "codeButton");
      button.setAttribute("class", "codeButton");
      button.setAttribute("type", "button");
      button.setAttribute("value", "Change Code");
      div.appendChild(button);
      div.appendChild(document.createElement("br"));
    }

    // For spacing
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createElement("br"));

    return div;
  }
  ctr.prototype.getInterface = getInterface;

  function getControls(controlHandler) {
    var that = this;
    var controls = new Array();
    for (var i = 0; i < this.parameterCount(); i++) {
      controls.push( { id       : this.parameterName(i),
                       target   : this,
                       on       : "input",
                       callback : controlHandler } );
    }

    function scriptHandler() {
      var editorArea = document.createElement("textarea");
      editorArea.id = "scriptEditor";
      editorArea.value = that.getCode();
      editorArea.cols = 60;
      editorArea.rows = 20;
      editorArea.spellcheck = false;

      function okClicked() {
        var code = editorArea.value;
        that.setCode(code);
      }

      function cancelClicked() {
        // Do nothing
      }

      var params = {};
      params.detail = {};
      params.detail.type = 'okcancel';
      params.detail.caption = 'Edit Code';
      params.detail.message = 'message';
      params.detail.okButton = 'Save Changes';
      params.detail.okHandler = okClicked;
      params.detail.cancelButton = 'Discard Changes';
      params.detail.cancelHandler = cancelClicked;
      params.detail.inescapable = true;
      params.detail.htmlNode = editorArea;
      var dialogEvent = new CustomEvent("denoto-dialogbox", params);
      document.dispatchEvent(dialogEvent);
    }

    if (this._type === "scpt") {
      controls.push( { id       : "codeButton",
                       target   : this,
                       on       : "click",
                       callback : scriptHandler } );
    }

    return controls;
  }
  ctr.prototype.getControls = getControls;

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
  ctr.prototype.getParamMap = getParamMap;
};

//! rhombus.instrument.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._instMap = [];

Rhombus._synthNameList = [
  ["mono",  "PolySynth"],
  ["noise", "Noise Synth"]
];

Rhombus._synthNameMap = {};

(function() {
  for (var i = 0; i < Rhombus._synthNameList.length; i++) {
    var entry = Rhombus._synthNameList[i];
    Rhombus._synthNameMap[entry[0]] = entry[1];
    Rhombus._instMap.push([entry[0], entry[1], undefined]);
  }
})();

Rhombus._sampleNameList = [
  ["drums1",         "Drums"],
  ["drums2",         "808"],
  ["tron_flute",     "Flute"],
  ["tron_woodwinds", "Woodwinds"],
  ["tron_brass_01",  "Brass 01"],
  ["tron_guitar",    "Guitar"],
  ["tron_choir",     "Choir"],
  ["tron_cello",     "Cello"],
  ["tron_strings",   "Strings"],
  ["tron_violins",   "Violins"],
  ["tron_16vlns",    "Violins 02"]
];

Rhombus._sampleNameMap = {};

(function() {
  for (var i = 0; i < Rhombus._sampleNameList.length; i++) {
    var entry = Rhombus._sampleNameList[i];
    Rhombus._sampleNameMap[entry[0]] = entry[1];
    Rhombus._instMap.push(["samp", entry[1], entry[0]]);
  }
})();

Rhombus.prototype.instrumentTypes = function() {
  var types = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    types.push(Rhombus._instMap[i][0]);
  }
  return types;
};

Rhombus.prototype.instrumentDisplayNames = function() {
  var names = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    names.push(Rhombus._instMap[i][1]);
  }
  return names;
};

Rhombus.prototype.sampleSets = function() {
  var sets = [];
  for (var i = 0; i < Rhombus._instMap.length; i++) {
    sets.push(Rhombus._instMap[i][2]);
  }
  return sets;
};

Rhombus.prototype.addInstrument = function(type, json, idx, sampleSet, addCallback) {
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
      instr = new Rhombus._Sampler(samplerOptionsFrom(options, "drums1"), this, addCallback, id);
    }
    else {
      instr = new Rhombus._Sampler(samplerOptionsFrom(options, sampleSet), this, addCallback, id);
    }
  }
  else {
    instr = new Rhombus._ToneInstrument(type, options, this, id);
  }

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
    this._toMaster(instr);
  }

  if (isDefined(gi)) {
    Rhombus.Util.numberifyInputs(gi);
    instr._graphInputs = gi;
  }

  var idToRemove = instr._id;
  var that = this;
  this.Undo._addUndoAction(function() {
    that.removeInstrument(idToRemove, true);
  });
  this._song._instruments.addObj(instr, idx);

  instr._graphType = "instrument";

  return instr._id;
};

Rhombus.prototype.removeInstrument = function(instrOrId, internal) {
  function inToId(instrOrId) {
    var id;
    if (typeof instrOrId === "object") {
      id = instrOrId._id;
    } else {
      id = +instrOrId;
    }
    return id;
  }

  var id = inToId(instrOrId);
  if (id < 0) {
    return;
  }

  // exercise the nuclear option
  this.killAllNotes();

  var instr = this._song._instruments.getObjById(id);
  var slot = this._song._instruments.getSlotById(id);

  var go = instr.graphOutputs();
  var gi = instr.graphInputs();

  if (!internal) {
    var that = this;
    this.Undo._addUndoAction(function() {
      that._song._instruments.addObj(instr, slot);
      instr._restoreConnections(go, gi);
    });
  }

  instr._removeConnections();
  this._song._instruments.removeId(id);
};

Rhombus.prototype._initPreviewNotes = function() {
  if (notDefined(this._previewNotes)) {
    this._previewNotes = [];
  }
};

Rhombus.prototype._isTargetTrackDefined = function(rhomb) {
  var targetId  = this._globalTarget;
  var targetTrk = this._song._tracks.getObjBySlot(targetId);

  if (notDefined(targetTrk)) {
    console.log("[Rhombus] - target track is not defined");
    return false;
  } else {
    return true;
  }
};

Rhombus.prototype.startPreviewNote = function(pitch, velocity) {
  if (notDefined(pitch) || !isInteger(pitch) || pitch < 0 || pitch > 127) {
    console.log("[Rhombus] - invalid preview note pitch");
    return;
  }

  this._initPreviewNotes();
  var targetId  = this._globalTarget;
  var targetTrk = this._song._tracks.getObjBySlot(targetId);

  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  if (notDefined(velocity) || velocity < 0 || velocity > 1) {
    velocity = 0.5;
  }

  var rtNote = new Rhombus.RtNote(pitch,
                               velocity,
                               Math.round(this.getPosTicks()),
                               0,
                               targetId,
                               this);

  this._previewNotes.push(rtNote);

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

Rhombus.prototype._killRtNotes = function(noteIds, targets) {
  for (var i = 0; i < targets.length; i++) {
    var inst = this._song._instruments.getObjById(targets[i]);
    if (isDefined(inst)) {
      for (var j = 0; j < noteIds.length; j++) {
        inst.triggerRelease(noteIds[j], 0);
      }
    }
  }
};

Rhombus.prototype.stopPreviewNote = function(pitch) {
  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  this._initPreviewNotes();
  var curTicks = Math.round(this.getPosTicks());

  var deadNoteIds = [];

  // Kill all preview notes with the same pitch as the input pitch, since
  // there is no way to distinguish between them
  //
  // If record is enabled, add the finished notes to the record buffer
  for (var i = this._previewNotes.length - 1; i >=0; i--) {
    var rtNote = this._previewNotes[i];
    if (rtNote._pitch === pitch) {
      deadNoteIds.push(rtNote._id);

      // handle wrap-around notes by clamping at the loop end
      if (curTicks < rtNote._start) {
        rtNote._end = this.getLoopEnd();
      }
      else {
        rtNote._end = curTicks;
      }

      // enforce a minimum length of 15 ticks
      if (rtNote._end - rtNote._start < 15) {
        rtNote._end = rtNote._start + 15;
      }

      if (this.isPlaying() && this.getRecordEnabled()) {
        this.Record.addToBuffer(rtNote);
      }

      this._previewNotes.splice(i, 1);
    }
  }

  var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
  this._killRtNotes(deadNoteIds, targets);
};

// Maintain an array of the currently sounding preview notes
Rhombus.prototype.killAllPreviewNotes = function() {
  var that = this;
  if (!this._isTargetTrackDefined(this)) {
    return;
  }

  this._initPreviewNotes();

  var deadNoteIds = [];
  while (this._previewNotes.length > 0) {
    var rtNote = this._previewNotes.pop();
    deadNoteIds.push(rtNote._id);
  }

  var targets = this._song._tracks.getObjBySlot(this._globalTarget)._targets;
  this._killRtNotes(deadNoteIds, targets);

  console.log("[Rhombus] - killed all preview notes");
};

Rhombus._addInstrumentFunctions = function(ctr) {
  Rhombus._addParamFunctions(ctr);
  Rhombus._addGraphFunctions(ctr);
  Rhombus._addAudioNodeFunctions(ctr);

  function setAutomationValueAtTime(value, time) {
    var base = this._currentParams.filter.frequency;
    var finalNormalized = this._getAutomationModulatedValue(base, value);
    var finalVal = this._unnormalizeMap.filter.frequency[0](finalNormalized);

    this._applyInstrumentFilterValueAtTime(finalVal, time);
  }
  ctr.prototype._setAutomationValueAtTime = setAutomationValueAtTime;
};

//! rhombus.instrument.sampler.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus._SuperToneSampler = function() {
  Tone.Sampler.apply(this, Array.prototype.slice.call(arguments));
}
Tone.extend(Rhombus._SuperToneSampler, Tone.Sampler);

Rhombus._SuperToneSampler.prototype.triggerAttack = function(note, time, velocity, offset) {
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

Rhombus._SuperToneSampler.prototype.set = function(params) {
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

Rhombus._Sampler = function(options, r, sampleCallback, id) {
  var samplerUnnormalizeMap = Rhombus._makeAudioNodeMap({
    "volume" : [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 0.56],
    "playbackRate" : [Rhombus._map.mapExp(0.25, 4), Rhombus._map.rawDisplay, 0.5],
    "envelope" : Rhombus._map.envelopeMap,
    "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
    "filter" : Rhombus._map.synthFilterMap
  });

  this._r = r;
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

  // We apply the params before so that this._currentParams is something reasonable.
  var def = Rhombus._map.generateDefaultSetObj(samplerUnnormalizeMap);
  thisSampler._normalizedObjectSet(def, true);
  if (isDefined(options) && isDefined(options.params)) {
    thisSampler._normalizedObjectSet(options.params, true);
  }

  function finish() {
    // Apply parameters to the actual loaded samplers now.
    thisSampler._normalizedObjectSet(thisSampler._currentParams, true);
    if (isDefined(sampleCallback)) {
      sampleCallback();
    }
  };

  if (isDefined(this._r._sampleResolver)) {
    this._r._sampleResolver(sampleSet, function(bufferMap) {
      thisSampler.setBuffers(bufferMap);
      finish();
    });
  } else {
    finish();
  }
};
Tone.extend(Rhombus._Sampler, Tone.Instrument);
Rhombus._addInstrumentFunctions(Rhombus._Sampler);

Rhombus._Sampler.prototype.setBuffers = function(bufferMap) {
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
    var sampler = new Rhombus._SuperToneSampler();
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

Rhombus._Sampler.prototype.triggerAttack = function(id, pitch, delay, velocity) {
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

Rhombus._Sampler.prototype.triggerRelease = function(id, delay) {
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

Rhombus._Sampler.prototype.killAllNotes = function() {
  var samplerKeys = Object.keys(this.samples);
  for (var idx in samplerKeys) {
    var sampler = this.samples[samplerKeys[idx]];
    sampler.triggerRelease();
  }
  this.triggered = {};
};

Rhombus._Sampler.prototype.toJSON = function() {
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

Rhombus._Sampler.prototype._normalizedObjectSet = function(params, internal) {
  if (notObject(params)) {
    return;
  }

  if (!internal) {
    var that = this;
    var oldParams = this._currentParams;
    this._r.Undo._addUndoAction(function() {
      that._normalizedObjectSet(oldParams, true);
    });
  }
  this._trackParams(params);

  var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap, true);
  var samplerKeys = Object.keys(this.samples);
  for (var idx in samplerKeys) {
    var sampler = this.samples[samplerKeys[idx]];
    sampler.set(unnormalized);
  }
};

Rhombus._Sampler.prototype._applyInstrumentFilterValueAtTime = function(freq, time) {
  var samplerKeys = Object.keys(this.samples);
  for (var idx in samplerKeys) {
    var sampler = this.samples[samplerKeys[idx]];
    sampler.filter.frequency.setValueAtTime(freq, time);
  }
};

Rhombus._Sampler.prototype.displayName = function() {
  return Rhombus._sampleNameMap[this._sampleSet];
};

//! rhombus.instrument.tone.js
//! authors: Spencer Phippen, Tim Grant
//!
//! Contains instrument definitions for instruments wrapped from Tone.
//!
//! license: MIT
Rhombus._ToneInstrument = function(type, options, r, id) {
  var mono = Tone.MonoSynth;
  var noise = Tone.NoiseSynth;
  var typeMap = {
    "mono" : mono,
    "noise": noise
  };

  var secondsDisplay = Rhombus._map.secondsDisplay;
  var dbDisplay = Rhombus._map.dbDisplay;
  var rawDisplay = Rhombus._map.rawDisplay;
  var hzDisplay = Rhombus._map.hzDisplay;

  var monoSynthMap = {
    "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
    "oscillator" : {
      "type" : [Rhombus._map.mapDiscrete("square", "sawtooth", "triangle", "sine", "pulse", "pwm"), rawDisplay, 0.0],
    },
    "envelope" : Rhombus._map.envelopeMap,
    "filter" : Rhombus._map.synthFilterMap,
    "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
    "detune" : [Rhombus._map.harmMapFn, rawDisplay, 0.5]
  };

  var unnormalizeMaps = {
    "mono" : monoSynthMap,
    "noise" : {
      "volume" : [Rhombus._map.mapLog(-96.32, 0), dbDisplay, 0.1],
      "noise" : {
        "type" : [Rhombus._map.mapDiscrete("white", "pink", "brown"), rawDisplay, 0.0]
      },
      "envelope" : Rhombus._map.envelopeMap,
      "filter" : Rhombus._map.synthFilterMap,
      "filterEnvelope" : Rhombus._map.filterEnvelopeMap,
    }
  };

  for (var key in unnormalizeMaps) {
    unnormalizeMaps[key] = Rhombus._makeAudioNodeMap(unnormalizeMaps[key]);
  }

  this._r = r;
  var ctr = typeMap[type];
  if (isNull(ctr) || notDefined(ctr)) {
    type = "mono";
    ctr = mono;
  }

  if (notDefined(id)) {
    this._r._newId(this);
  } else {
    this._r._setId(this, id);
  }

  // just a hack to stop this control from showing up
  if (isDefined(options)) {
    options["dry/wet"] = undefined;
  }

  this._type = type;
  this._unnormalizeMap = unnormalizeMaps[this._type];
  this._currentParams = {};
  this._triggered = {};

  Tone.PolySynth.call(this, undefined, ctr);
  var def = Rhombus._map.generateDefaultSetObj(unnormalizeMaps[this._type]);
  this._normalizedObjectSet(def, true);
  this._normalizedObjectSet(options, true);
};
Tone.extend(Rhombus._ToneInstrument, Tone.PolySynth);
Rhombus._addInstrumentFunctions(Rhombus._ToneInstrument);

Rhombus._ToneInstrument.prototype.triggerAttack = function(id, pitch, delay, velocity) {
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

Rhombus._ToneInstrument.prototype.triggerRelease = function(id, delay) {
  var tR = Tone.PolySynth.prototype.triggerRelease;
  var freq = this._triggered[id];
  if (delay > 0) {
    tR.call(this, freq, "+" + delay);
  } else {
    tR.call(this, freq);
  }
  delete this._triggered[id];
};

Rhombus._ToneInstrument.prototype.killAllNotes = function() {
  var freqs = [];
  for (var id in this._triggered) {
    freqs.push(this._triggered[id]);
  }
  Tone.PolySynth.prototype.triggerRelease.call(this, freqs);
  this._triggered = {};
};

Rhombus._ToneInstrument.prototype.toJSON = function() {
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

Rhombus._ToneInstrument.prototype._normalizedObjectSet = function(params, internal) {
  if (notObject(params)) {
    return;
  }

  if (!internal) {
    var that = this;
    var oldParams = this._currentParams;
    this._r.Undo._addUndoAction(function() {
      that._normalizedObjectSet(oldParams, true);
    });
  }
  this._trackParams(params);
  var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap, true);
  this.set(unnormalized);
};

Rhombus._ToneInstrument.prototype._applyInstrumentFilterValueAtTime = function(freq, time) {
  for (var vIdx = 0; vIdx < this._voices.length; vIdx++) {
    var voice = this._voices[vIdx];
    voice.filter.frequency.setValueAtTime(freq, time);
  }
};


Rhombus._ToneInstrument.prototype.displayName = function() {
  return Rhombus._synthNameMap[this._type];
};

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
    "dist" : Rhombus._Distortion,
    "filt" : Rhombus._Filter,
    "eq"   : Rhombus._EQ,
    "dely" : Rhombus._Delay,
    "comp" : Rhombus._Compressor,
    "gain" : Rhombus._Gainer,
    "bitc" : Rhombus._BitCrusher,
    "revb" : Rhombus._Reverb,
    "chor" : Rhombus._Chorus,
    "scpt" : Rhombus._Script
  };

  var options, go, gi, id, graphX, graphY, code;
  if (isDefined(json)) {
    options = json._params;
    go = json._graphOutputs;
    gi = json._graphInputs;
    id = json._id;
    graphX = json._graphX;
    graphY = json._graphY;
    code = json._code;
  }

  var ctr;
  if (type === "mast") {
    if (masterAdded(this._song)) {
      return;
    }
    ctr = Rhombus._Master;
  } else {
    ctr = ctrMap[type];
  }

  if (notDefined(ctr)) {
    ctr = ctrMap["dist"];
  }

  var eff;
  if (isDefined(code)) {
    eff = new ctr(code);
  } else {
    eff = new ctr();
  }

  if (isNull(eff) || notDefined(eff)) {
    return;
  }

  eff._r = this;
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

  if (ctr === Rhombus._Master) {
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

  var gi = effect.graphInputs();
  var go = effect.graphOutputs();
  var that = this;
  this.Undo._addUndoAction(function() {
    that._song._effects[id] = effect;
    effect._restoreConnections(go, gi);
  });
  effect._removeConnections();
  delete this._song._effects[id];

  // exercise the nuclear option
  this.killAllNotes();
};

Rhombus._makeEffectMap = function(obj) {
  var newObj = {};
  for (var key in obj) {
    newObj[key] = obj[key];
  }
  newObj["dry/wet"] = [Rhombus._map.mapIdentity, Rhombus._map.rawDisplay, 1.0];
  newObj["gain"] = [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 1.0/2.0];
  newObj = Rhombus._makeAudioNodeMap(newObj);
  return newObj;
};

Rhombus._addEffectFunctions = function(ctr) {
  function normalizedObjectSet(params, internal) {
    if (notObject(params)) {
      return;
    }

    if (!internal) {
      var that = this;
      var oldParams = this._currentParams;
      this._r.Undo._addUndoAction(function() {
        that._normalizedObjectSet(oldParams, true);
      });
    }
    this._trackParams(params);
    var unnormalized = Rhombus._map.unnormalizedParams(params, this._unnormalizeMap, true);
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
    if (isDefined(this._code)) {
      jsonVersion._code = this._code;
    }
    return jsonVersion;
  }

  ctr.prototype._normalizedObjectSet = normalizedObjectSet;
  Rhombus._addParamFunctions(ctr);
  Rhombus._addGraphFunctions(ctr);
  Rhombus._addAudioNodeFunctions(ctr);
  ctr.prototype.toJSON = toJSON;
  ctr.prototype.isMaster = isMaster;

  // Swizzle out the set method for one that does gain + dry/wet.
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

  ctr.prototype._setAutomationValueAtTime = function(value, time) {
    var base = this._currentParams.gain;
    var finalNormalized = this._getAutomationModulatedValue(base, value);
    var finalVal = this._unnormalizeMap.gain[0](finalNormalized);
    this.output.gain.setValueAtTime(finalVal, time);
  }
};

//! rhombus.effect.tone.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
Rhombus._construct = function(ctr, args) {
  function F() {
    return ctr.apply(this, args);
  }
  F.prototype = ctr.prototype;
  return new F();
};

// Distortion
Rhombus._Distortion = function() {
  Tone.Distortion.apply(this, arguments);
};
Tone.extend(Rhombus._Distortion, Tone.Distortion);
Rhombus._addEffectFunctions(Rhombus._Distortion);

Rhombus._Distortion.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "distortion" : [Rhombus._map.mapLinear(0, 4), Rhombus._map.rawDisplay, 0.4],
  "oversample" : [Rhombus._map.mapDiscrete("none", "2x", "4x"), Rhombus._map.rawDisplay, 0.0]
});

Rhombus._Distortion.prototype.displayName = function() {
  return "Distortion";
};

// BitCrusher
Rhombus._BitCrusher = function() {
  Tone.Effect.apply(this, arguments);
};
Tone.extend(Rhombus._BitCrusher, Tone.Effect);

Rhombus._BitCrusher.prototype.set = function(options) {
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
Rhombus._addEffectFunctions(Rhombus._BitCrusher);

Rhombus._BitCrusher.prototype._unnormalizeMap = (function() {
  var bitValues = [];
  (function() {
    for (var i = 1; i <= 16; i++) {
      bitValues.push(i);
    }
  })();

  return Rhombus._makeEffectMap({
  "bits" : [Rhombus._map.mapDiscrete.apply(this, bitValues), Rhombus._map.rawDisplay, 0.49]
  });

})();

Rhombus._BitCrusher.prototype.displayName = function() {
  return "Bitcrusher";
};

// Filter
Rhombus._Filter = function() {
  Tone.Effect.call(this);
  this._filter = Rhombus._construct(Tone.Filter, arguments);
  this.connectEffect(this._filter);
};
Tone.extend(Rhombus._Filter, Tone.Effect);

Rhombus._Filter.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._filter.set.apply(this._filter, arguments);
};
Rhombus._addEffectFunctions(Rhombus._Filter);

Rhombus._Filter.prototype._unnormalizeMap = Rhombus._makeEffectMap(Rhombus._map.filterMap);

Rhombus._Filter.prototype.displayName = function() {
  return "Filter";
};

Rhombus._Filter.prototype._setAutomationValueAtTime = function(value, time) {
  var base = this._currentParams.frequency;
  var finalNormalized = this._getAutomationModulatedValue(base, value);
  var finalVal = this._unnormalizeMap.frequency[0](finalNormalized);
  this._filter.frequency.setValueAtTime(finalVal, time);
};

// EQ
Rhombus._EQ = function() {
  Tone.Effect.call(this);
  this._eq = Rhombus._construct(Tone.EQ, arguments);
  this.connectEffect(this._eq);
};
Tone.extend(Rhombus._EQ, Tone.Effect);

Rhombus._EQ.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._eq.set.apply(this._eq, arguments);
};
Rhombus._addEffectFunctions(Rhombus._EQ);

Rhombus._EQ.prototype._unnormalizeMap = (function() {
  var volumeMap = [Rhombus._map.mapLog(-96.32, 0), Rhombus._map.dbDisplay, 1.0];
  return Rhombus._makeEffectMap({
    "low" : volumeMap,
    "mid" : volumeMap,
    "high" : volumeMap,
    "lowFrequency" : [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.2],
    "highFrequency": [Rhombus._map.freqMapFn, Rhombus._map.hzDisplay, 0.8]
  });
})();

Rhombus._EQ.prototype.displayName = function() {
  return "EQ";
};

// Compressor
Rhombus._Compressor = function() {
  Tone.Effect.call(this);
  this._comp = Rhombus._construct(Tone.Compressor, arguments);
  this.connectEffect(this._comp);
};
Tone.extend(Rhombus._Compressor, Tone.Effect);

Rhombus._Compressor.prototype.set = function() {
  Tone.Effect.prototype.set.apply(this, arguments);
  this._comp.set.apply(this._comp, arguments);
};
Rhombus._addEffectFunctions(Rhombus._Compressor);

Rhombus._Compressor.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "attack" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.0],
  "release" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.0],
  "threshold" : [Rhombus._map.mapLog(-100, 0), Rhombus._map.dbDisplay, 0.3],
  "knee" : [Rhombus._map.mapLinear(0, 40), Rhombus._map.dbDisplay, 0.75],
  "ratio" : [Rhombus._map.mapLinear(1, 20), Rhombus._map.dbDisplay, 11.0/19.0]
});

Rhombus._Compressor.prototype.displayName = function() {
  return "Compressor";
};

// Gain
Rhombus._Gainer = function() {
  Tone.Effect.call(this);
  this.effectSend.connect(this.effectReturn);
};
Tone.extend(Rhombus._Gainer, Tone.Effect);
Rhombus._addEffectFunctions(Rhombus._Gainer);

Rhombus._Gainer.prototype._unnormalizeMap = Rhombus._makeEffectMap({});

Rhombus._Gainer.prototype.displayName = function() {
  return "Gain";
};

// For feedback effects
Rhombus._map.feedbackMapSpec = [Rhombus._map.mapLinear(-1, 1), Rhombus._map.rawDisplay, 0.5];

// Chorus
Rhombus._Chorus = function() {
  Tone.Chorus.call(this);
};
Tone.extend(Rhombus._Chorus, Tone.Chorus);
Rhombus._addEffectFunctions(Rhombus._Chorus);

Rhombus._Chorus.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "rate" : [Rhombus._map.mapLinear(0.1, 10), Rhombus._map.hzDisplay, 2.0],
  "delayTime" : [Rhombus._map.shortTimeMapFn, Rhombus._map.secondsDisplay, 0.25],
  "depth" : [Rhombus._map.mapLinear(0, 2), Rhombus._map.rawDisplay, 0.35],
  "type" : [Rhombus._map.mapDiscrete("sine", "square", "sawtooth", "triangle"), Rhombus._map.rawDisplay, 0.0],
  "feedback" : [Rhombus._map.mapLinear(-0.25, 0.25), Rhombus._map.rawDisplay, 0.5]
});

Rhombus._Chorus.prototype.displayName = function() {
  return "Chorus";
};

// (Feedback) Delay
Rhombus._Delay = function() {
  Tone.FeedbackDelay.call(this);
}
Tone.extend(Rhombus._Delay, Tone.FeedbackDelay);
Rhombus._addEffectFunctions(Rhombus._Delay);

Rhombus._Delay.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "delayTime" : [Rhombus._map.timeMapFn, Rhombus._map.secondsDisplay, 0.2],
  "feedback" : Rhombus._map.feedbackMapSpec
});

Rhombus._Delay.prototype.displayName = function() {
  return "Delay";
};

// Reverb
Rhombus._Reverb = function() {
  Tone.Freeverb.call(this);
}
Tone.extend(Rhombus._Reverb, Tone.Freeverb);
Rhombus._addEffectFunctions(Rhombus._Reverb);

Rhombus._Reverb.prototype._unnormalizeMap = Rhombus._makeEffectMap({
  "roomSize" : [Rhombus._map.mapLinear(0.001, 0.999), Rhombus._map.rawDisplay, 0.7],
  "dampening" : [Rhombus._map.mapLinear(0, 1), Rhombus._map.rawDisplay, 0.5]
});

Rhombus._Reverb.prototype.displayName = function() {
  return "Reverb";
};

//! rhombus.effect.master.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
Rhombus._Master = function() {
  Tone.Effect.call(this);
  this.effectSend.connect(this.effectReturn);
  this.setDry(1);
  this.toMaster();
};
Tone.extend(Rhombus._Master, Tone.Effect);
Rhombus._addEffectFunctions(Rhombus._Master);
Rhombus._Master.prototype.isMaster = function() { return true; };

Rhombus._Master.prototype._unnormalizeMap = Rhombus._makeEffectMap({});

Rhombus._Master.prototype.displayName = function() {
  return "Master";
};

//! rhombus.effect.script.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT
Rhombus._Script = function(code) {
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
  this._processorNode = Rhombus._ctx.createScriptProcessor(4096, 1, 1);
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

  if (isDefined(code)) {
    this.setCode(code);
  } else {
    this.setCode('\n' +
    'function() {\n' +
    '  var toRet = [];\n' +
    '  for (var chan = 0; chan < M.channelCount; chan++) {\n' +
    '    var inpData = M.inputSamples(chan);\n' +
    '    var outData = [];\n' +
    '    outData[inpData.length-1] = undefined;\n' +
    '    for (var samp = 0; samp < inpData.length; samp++) {\n' +
    '      outData[samp] = Math.random() * inpData[samp];\n' +
    '    }\n' +
    '    toRet.push(outData);\n' +
    '  }\n' +
    '  return toRet;\n' +
    '}\n');
  }

  this.connectEffect(this._processorNode);
};
Tone.extend(Rhombus._Script, Tone.Effect);

Rhombus._Script.prototype.setCode = function(str) {
  var that = this;
  this._code = str;
  caja.load(undefined, undefined, function(frame) {
    if (!that._tamedM) {
      caja.markReadOnlyRecord(that._M);
      caja.markFunction(that._M.inputSamples);
      caja.markFunction(that._M.setProcessor);
      caja.markFunction(that._M.log);
      that._tamedM = caja.tame(that._M);
    }

    frame.code(undefined, 'text/javascript', 'M.setProcessor(' + str + ');\n')
    .api({
      M: that._tamedM
    })
    .run();
  });
};

Rhombus._Script.prototype.getCode = function() {
  return this._code;
};
Rhombus._addEffectFunctions(Rhombus._Script);

Rhombus._Script.prototype._unnormalizeMap = Rhombus._makeEffectMap({});
Rhombus._Script.prototype.displayName = function() {
  return "Script";
};

//! rhombus.pattern.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus.NoteMap = function(r, id) {
  this._r = r;
  if (isDefined(id)) {
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  this._avl = new AVL();
};

Rhombus.NoteMap.prototype.addNote = function(note) {
  if (!(note instanceof Rhombus.Note)) {
    console.log("[Rhombus] - trying to add non-Note object to NoteMap");
    return false;
  };

  var key = Math.round(note.getStart());

  // don't allow multiple copies of the same note
  var elements = this._avl.search(key);
  for (var i = 0; i < elements.length; i++) {
    if (note === elements[i]) {
      console.log("[Rhombus] - trying to add duplicate Note to NoteMap");
      return false;
    }
  }

  if (isDefined(this._r._constraints.max_notes)) {
    if (this._r._song._noteCount >= this._r._constraints.max_notes) {
      return false;
    }
  }

  this._r._song._noteCount++;
  this._avl.insert(key, note);
  return true;
};

Rhombus.NoteMap.prototype.getNote = function(noteId) {
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
};

Rhombus.NoteMap.prototype.getNotesAtTick = function(tick, lowPitch, highPitch) {
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
};

Rhombus.NoteMap.prototype.removeNote = function(noteId, note) {
  if (notDefined(note) || !(note instanceof Rhombus.Note)) {
    note = this.getNote(noteId);
  }

  if (notDefined(note)) {
    console.log("[Rhombus] - note not found in NoteMap");
    return false;
  }

  var atStart = this._avl.search(note.getStart()).length;
  if (atStart > 0) {
    this._r._song._noteCount--;
    this._avl.delete(note.getStart(), note);
  }

  return true;
};

Rhombus.NoteMap.prototype.toJSON = function() {
  var jsonObj = {};
  this._avl.executeOnEveryNode(function (node) {
    for (var i = 0; i < node.data.length; i++) {
      var note = node.data[i];
      jsonObj[note._id] = note;
    }
  });
  return jsonObj;
};

Rhombus.AutomationEvent = function(time, value, r, id) {
  this._r = r;
  if (isDefined(id)) {
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  this._time = time;
  this._value = value;
};

Rhombus.AutomationEvent.prototype.getTime = function() {
  if (notInteger(this._time)) {
    this._time = 0;
  }
  return this._time;
}

Rhombus.AutomationEvent.prototype.getValue = function() {
  if (notNumber(this._value)) {
    this._value = 0.5;
  }
  return this._value;
}

Rhombus.Pattern = function(r, id) {
  this._r = r;
  if (isDefined(id)) {
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  // pattern metadata
  this._name = "Pattern ID " + this._id;
  this._color = getRandomColor();
  this._selected = false;

  // pattern structure data
  this._length = 1920;
  this._noteMap = new Rhombus.NoteMap(this._r);

  this._automation = new AVL({ unique: true });
};

Rhombus.Pattern.prototype.getLength = function() {
  return this._length;
};

Rhombus.Pattern.prototype.setLength = function(length) {
  if (isDefined(length) && length >= 0) {
    var oldLength = this._length;
    var that = this;
    this._r.Undo._addUndoAction(function() {
      that._length = oldLength;
    });
    this._length = length;
  }
};

Rhombus.Pattern.prototype.getName = function() {
  return this._name;
};

Rhombus.Pattern.prototype.setName = function(name) {
  if (notDefined(name)) {
    return undefined;
  } else {
    var oldName = this._name;
    this._name = name.toString();

    var that = this;
    this._r.Undo._addUndoAction(function() {
      that._name = oldName;
    });

    return this._name;
  }
};


Rhombus.Pattern.prototype.getColor = function() {
  return this._color;
};

Rhombus.Pattern.prototype.setColor = function(color) {
  var oldColor = this._color;
  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._color = oldColor;
  });
  this._color = color;
};

Rhombus.Pattern.prototype.addNote = function(note) {
  this._noteMap.addNote(note);
  this.clearSelectedNotes();
};

Rhombus.Pattern.prototype.addNotes = function(notes) {
  if (isDefined(notes)) {
    for (var i = 0; i < notes.length; i++) {
      this.addNote(notes[i]);
    }
  }
  this.clearSelectedNotes();
};

Rhombus.Pattern.prototype.getNote = function(noteId) {
  return this._noteMap.getNote(noteId);
};

Rhombus.Pattern.prototype.deleteNote = function(noteId, note) {
  if (notDefined(note)) {
    note = this._noteMap.getNote(noteId);
  }

  if (notDefined(note)) {
    console.log("[Rhombus] - note not found in pattern");
    return undefined;
  }

  this._noteMap.removeNote(noteId, note);
  return note;
};

Rhombus.Pattern.prototype.deleteNotes = function(notes) {
  if (notDefined(notes)) {
    return;
  }
  for (var i = 0; i < notes.length; i++) {
    var note = notes[i];
    this.deleteNote(note._id, note);
  }
};

Rhombus.Pattern.prototype.getAllNotes = function() {
  var notes = new Array();
  this._noteMap._avl.executeOnEveryNode(function (node) {
    for (var i = 0; i < node.data.length; i++) {
      notes.push(node.data[i]);
    }
  });
  return notes;
};

Rhombus.Pattern.prototype.getNotesInRange = function(start, end, ignoreEnds) {
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
};

Rhombus.Pattern.prototype.getNotesAtTick = function(tick, lowPitch, highPitch, single) {
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
      return [note];
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
};

Rhombus.Pattern.prototype.getSelectedNotes = function() {
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
};

Rhombus.Pattern.prototype.clearSelectedNotes = function() {
  var selected = this.getSelectedNotes();
  for (var i = 0; i < selected.length; i++) {
    selected[i].deselect();
  }
};

Rhombus.Pattern.prototype.getAutomationEventsInRange = function(start, end) {
  return this._automation.betweenBounds({ $lt: end, $gte: start });
};

Rhombus.Pattern.prototype.toJSON = function() {
  var jsonObj = {
    "_id"      : this._id,
    "_name"    : this._name,
    "_color"   : this._color,
    "_length"  : this._length,
    "_noteMap" : this._noteMap.toJSON()
  };
  return jsonObj;
};

Rhombus.prototype._noteArrayFromJSONNoteMap = function(noteMap) {
  var notes = [];
  for (var noteId in noteMap) {
    var velocity = +noteMap[noteId]._velocity;
    if (notDefined(velocity) || velocity < 0 || velocity > 1) {
      velocity = 0.5;
    }

    var note = new Rhombus.Note(+noteMap[noteId]._pitch,
                                +noteMap[noteId]._start,
                                +noteMap[noteId]._length,
                                velocity,
                                this,
                                +noteId);
    notes.push(note);
  }
  return notes;
};

// TODO: Note should probably have its own source file
Rhombus.Note = function(pitch, start, length, velocity, r, id) {
  this._r = r;
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
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  this._pitch    = +pitch;
  this._start    = +start    || 0;
  this._length   = +length   || 0;
  this._velocity = +velocity;
  this._selected = false;

  return this;
};


Rhombus.Note.prototype.getPitch = function() {
  return this._pitch;
};

Rhombus.Note.prototype.getStart = function() {
  return this._start;
};

Rhombus.Note.prototype.getLength = function() {
  return this._length;
};

Rhombus.Note.prototype.getVelocity = function() {
  return this._velocity;
};

Rhombus.Note.prototype.setVelocity = function(velocity) {
  var floatVal = parseFloat(velocity);
  if (isDefined(floatVal) && floatVal > 0 && floatVal <= 1.0) {
    this._velocity = floatVal;
  }
};

// TODO: check for off-by-one issues
Rhombus.Note.prototype.getEnd = function() {
  return this._start + this._length;
};

Rhombus.Note.prototype.select = function() {
  return (this._selected = true);
};

Rhombus.Note.prototype.deselect = function() {
  return (this._selected = false);
};

Rhombus.Note.prototype.toggleSelect = function() {
  return (this._selected = !this._selected);
};

Rhombus.Note.prototype.getSelected = function() {
  return this._selected;
};

Rhombus.Note.prototype.setSelected = function(select) {
  return (this._selected = select);
};

Rhombus.Note.prototype.toJSON = function() {
  var jsonObj = {
    "_id"       : this._id,
    "_pitch"    : this._pitch,
    "_start"    : this._start,
    "_length"   : this._length,
    "_velocity" : this._velocity
  };
  return jsonObj;
};

//! rhombus.track.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus.PlaylistItem = function(trkId, ptnId, start, length, r, id) {
  this._r = r;
  if (isDefined(id)) {
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  this._trkId = trkId;
  this._ptnId = ptnId;
  this._start = start;
  this._length = length;
  this._selected = false;
};

Rhombus.PlaylistItem.prototype.setStart = function(start) {
  if (notDefined(start)) {
    return undefined;
  }

  var startVal = parseInt(start);
  if (startVal < 0) {
    return undefined;
  }

  var oldStart = this._start;
  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._start = oldStart;
  });

  return this._start = startVal;
};

Rhombus.PlaylistItem.prototype.getStart = function() {
  return this._start;
};

Rhombus.PlaylistItem.prototype.setLength = function(length) {
  if (notDefined(length)) {
    return undefined;
  }

  var lenVal = parseInt(length);
  if (lenVal < 0) {
    return undefined;
  }

  var oldLength = this._length;
  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._length = oldLength;
  });

  return this._length = lenVal;
};

Rhombus.PlaylistItem.prototype.getLength = function() {
  return this._length;
};

Rhombus.PlaylistItem.prototype.getTrackIndex = function() {
  return this._r._song._tracks.getSlotById(this._trkId);
};

Rhombus.PlaylistItem.prototype.getPatternId = function() {
  return this._ptnId;
};

// TODO: factor out shared selection code
Rhombus.PlaylistItem.prototype.select = function() {
  return (this._selected = true);
};

Rhombus.PlaylistItem.prototype.deselect = function() {
  return (this._selected = false);
};

Rhombus.PlaylistItem.prototype.toggleSelect = function() {
  return (this._selected = !this._selected);
};

Rhombus.PlaylistItem.prototype.getSelected = function() {
  return this._selected;
};

Rhombus.PlaylistItem.prototype.setSelected = function(select) {
  return (this._selected = select);
};

Rhombus.PlaylistItem.prototype.toJSON = function() {
  var jsonObj = {
    "_id"     : this._id,
    "_trkId"  : this._trkId,
    "_ptnId"  : this._ptnId,
    "_start"  : this._start,
    "_length" : this._length,
  };
  return jsonObj;
};

Rhombus.RtNote = function(pitch, velocity, start, end, target, r) {
  this._r = r;
  this._r._newRtId(this);
  this._pitch    = (isNaN(pitch) || notDefined(pitch)) ? 60 : pitch;
  this._velocity = +velocity || 0.5;
  this._start    = start || 0;
  this._end      = end || 0;
  this._target   = target;

  return this;
};

Rhombus.Track = function(r, id) {
  this._r = r;
  if (isDefined(id)) {
    this._r._setId(this, id);
  } else {
    this._r._newId(this);
  }

  // track metadata
  this._name = "Track ID " + this._id;
  this._mute = false;
  this._solo = false;

  // track structure data
  this._targets = [];
  this._effectTargets = [];
  this._playingNotes = {};
  this._playlist = {};

  this._graphSetup(0, 0, 0, 1);
};
Rhombus._addGraphFunctions(Rhombus.Track);

Rhombus.Track.prototype._graphType = "track";

Rhombus.Track.prototype.getName = function() {
  return this._name;
};

Rhombus.Track.prototype.setName = function(name) {
  if (notDefined(name)) {
    return undefined;
  }
  else {
    var oldValue = this._name;
    this._name = name.toString();

    var that = this;
    this._r.Undo._addUndoAction(function() {
      that._name = oldValue;
    });

    return this._name;
  }
};

Rhombus.Track.prototype.getMute = function() {
  return this._mute;
};

Rhombus.Track.prototype.setMute = function(mute) {
  if (typeof mute !== "boolean") {
    return undefined;
  }

  var oldMute = this._mute;
  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._mute = oldMute;
  });

  this._mute = mute;

  if (mute) {
    this.killAllNotes();
  }

  return mute;
};

Rhombus.Track.prototype.toggleMute = function() {
  return this.setMute(!this.getMute());
};

Rhombus.Track.prototype.getSolo = function() {
  return this._solo;
};

Rhombus.Track.prototype.setSolo = function(solo) {
  if (typeof solo !== "boolean") {
    return undefined;
  }

  var soloList = this._r._song._soloList;

  var oldSolo = this._solo;
  var oldSoloList = soloList.slice(0);
  var that = this;
  this._r.Undo._addUndoAction(function() {
    that._solo = oldSolo;
    that._r._song._soloList = oldSoloList;
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

Rhombus.Track.prototype.toggleSolo =function() {
  return this.setSolo(!this.getSolo());
};

Rhombus.Track.prototype.getPlaylist =function() {
  return this._playlist;
};

// Determine if a playlist item exists that overlaps with the given range
Rhombus.Track.prototype.checkOverlap = function(start, end) {
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

Rhombus.Track.prototype.addToPlaylist = function(ptnId, start, length) {
  // All arguments must be defined
  if (notDefined(ptnId) || notDefined(start) || notDefined(length)) {
    return undefined;
  }

  // ptnId must belong to an existing pattern
  if (notDefined(this._r._song._patterns[ptnId])) {
    return undefined;
  }

  var newItem = new Rhombus.PlaylistItem(this._id, ptnId, start, length, this._r);
  this._playlist[newItem._id] = newItem;

  var that = this;
  this._r.Undo._addUndoAction(function() {
    delete that._playlist[newItem._id];
  });

  return newItem._id;
};

Rhombus.Track.prototype.getPlaylistItemById = function(id) {
  return this._playlist[id];
};

Rhombus.Track.prototype.getPlaylistItemByTick = function(tick) {
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

Rhombus.Track.prototype.removeFromPlaylist = function(itemId) {
  console.log("[Rhombus] - deleting playlist item " + itemId);
  itemId = itemId.toString();
  if (!(itemId in this._playlist)) {
    return undefined;
  } else {

    var obj = this._playlist[itemId];
    var that = this;
    this._r.Undo._addUndoAction(function() {
      that._playlist[itemId] = obj;
    });

    delete this._playlist[itemId.toString()];
  }

  return itemId;
};

Rhombus.Track.prototype.getSelectedItems = function() {
  var items = new Array();
  for (var itemId in this._playlist) {
    var item = this._playlist[itemId];
    if (item._selected) {
      items.push(item);
    }
  }
  return items;
};

Rhombus.Track.prototype.killAllNotes = function() {
  var playingNotes = this._playingNotes;

  var r = this._r;
  for (var rtNoteId in playingNotes) {
    r._song._instruments.objIds().forEach(function(instId) {
      r._song._instruments.getObjById(instId).triggerRelease(rtNoteId, 0);
    });
    delete playingNotes[rtNoteId];
  }
};

Rhombus.Track.prototype.toJSON = function() {
  var toReturn = {};
  toReturn._id = this._id;
  toReturn._name = this._name;
  toReturn._playlist = this._playlist;
  toReturn._graphOutputs = this._graphOutputs;
  toReturn._graphInputs = this._graphInputs;
  return toReturn;
};

Rhombus.Track.prototype.exportEvents = function() {
  var events = new AVL();
  var playlist = this._playlist;
  for (var itemId in playlist) {
    var srcPtn = this._r.getSong().getPatterns()[playlist[itemId]._ptnId];
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

Rhombus.Track.prototype._internalGraphConnect = function(output, b, bInput) {
  if (b.isInstrument()) {
    this._targets.push(b._id);
  } else if (b.isEffect()) {
    this._effectTargets.push(b._id);
  }
};

Rhombus.Track.prototype._internalGraphDisconnect = function(output, b, bInput) {
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
    var pattern = new Rhombus.Pattern(this._r);
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
  var track = new Rhombus.Track(this._r);
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
 * @param {Function} readyToPlayCallback A function called when the samplers have loaded their samples.
 */
Rhombus.prototype.importSong = function(json, readyToPlayCallback) {
  // THIS LINE IS NEEDED FOR GARBAGE COLLECTION TO HAPPEN
  // VERY IMPORTANT FOR STABILITY WHEN IMPORTING SONGS MULTIPLE TIMES DURING THE SAME PAGE LIFETIME
  this.disconnectFromCtxOut();

  var samplerCount = 0;
  var samplersDone = -1;
  function samplerCallback() {
    samplersDone += 1;
    if (samplersDone === samplerCount) {
      if (isDefined(readyToPlayCallback)) {
        readyToPlayCallback();
      }
    }
  }

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

    var newPattern = new Rhombus.Pattern(this, +ptnId);

    newPattern._name = pattern._name;
    newPattern._length = pattern._length;

    if (isDefined(pattern._color)) {
      newPattern.setColor(pattern._color);
    }

    var notes = this._noteArrayFromJSONNoteMap(noteMap);
    for (var noteIdx = 0; noteIdx < notes.length; noteIdx++) {
      newPattern.addNote(notes[noteIdx]);
    }

    this._song._patterns[+ptnId] = newPattern;
  }

  for (var trkIdIdx in tracks._slots) {
    var trkId = +tracks._slots[trkIdIdx];
    var track = tracks._map[trkId];
    var playlist = track._playlist;

    // Create a new track and manually set its ID
    var newTrack = new Rhombus.Track(this, trkId);

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

      var newItem = new Rhombus.PlaylistItem(parentId,
                                             item._ptnId,
                                             item._start,
                                             item._length,
                                             this,
                                             item._id);

      newTrack._playlist[+itemId] = newItem;
    }

    this._song._tracks.addObj(newTrack, trkIdIdx);
  }

  for (var instIdIdx in instruments._slots) {
    var instId = instruments._slots[instIdIdx];
    var inst = instruments._map[instId];
    console.log("[Rhombus.importSong] - adding instrument of type " + inst._type);
    if (isDefined(inst._sampleSet)) {
      console.log("[Rhombus.importSong] - sample set is: " + inst._sampleSet);
    }

    if (inst._type === "samp") {
      samplerCount += 1;
    }

    this.addInstrument(inst._type, inst, +instIdIdx, inst._sampleSet, samplerCallback);
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

  samplerCallback();
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

              var rtNote = new Rhombus.RtNote(note.getPitch(),
                                              note.getVelocity(),
                                              noteStartTime,
                                              endTime,
                                              track._id,
                                              r);

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
      startTime = Rhombus._ctx.currentTime;

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
        return Rhombus._ctx.currentTime + time;
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
      return Rhombus._ctx.currentTime - startTime;
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
        time = seconds - Rhombus._ctx.currentTime;
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
      if (notDefined(note)) {
        return;
      }

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
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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
          if (note._start < 0) {
            note._start = 0;
          }
          ptn.addNote(note);
        }
      }
    };

    r.Edit.deleteNote = function(noteId, ptnId) {
      var note = r._song._patterns[ptnId].deleteNote(noteId);

      if (notDefined(note)) {
        return;
      }

      r.Undo._addUndoAction(function() {
        r._song._patterns[ptnId].addNote(note);
      });
    };

    r.Edit.deleteNotes = function(notes, ptnId) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      if (notDefined(velocity) || !isNumber(velocity) || velocity < 0 || velocity > 1) {
        console.log("[Rhombus.Edit] - invalid velocity");
        return false;
      }

      if (notDefined(onlySelected) || typeof onlySelected !== "boolean") {
        console.log("[Rhombus.Edit] - onlySelected must be of type Boolean");
        return false;
      }

      for (var i = 0; i < notes.length; i++) {
        if (onlySelected && !notes[i]._selected) {
          continue;
        }
        notes[i]._velocity = velocity;
      }

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
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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

    r.Edit.applyNoteLengths = function(notes, lengths) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

      var oldValues = new Array(notes.length);
      for (var i = 0; i < notes.length; i++) {
        oldValues[i] = notes[i]._length;
      }

      r.Undo._addUndoAction(function() {
        for (var i = 0; i < notes.length; i++) {
          notes[i]._length = oldValues[i];
        }
      });

      // apply the changes
      for (var i = 0; i < notes.length; i++) {
        var length = lengths[i];
        if (length < 1) {
          r.Undo.doUndo();
          return false;
        }
        notes[i]._length = lengths[i];
      }

      return true;
    };

    r.Edit.setNoteLengths = function(ptnId, notes, length) {
      if (notDefined(notes) || notes.length < 1) {
        return;
      }

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

    var noteChangesStarted = false;
    var oldNotes;
    var noteChangesPtnId;
    function undoAddedCallback() {
      if (noteChangesStarted) {
        noteChangesStarted = false;
        oldNotes = undefined;
        noteChangesPtnId = undefined;

        console.log("[Rhomb.Edit] - note changes interrupted by another undo action");
      }
    }
    r.Undo._registerUndoAddedCallback(undoAddedCallback);
    r.Edit.startNoteChanges = function(ptnId) {
      var pattern = r._song._patterns[ptnId];
      if (notDefined(pattern)) {
        return;
      }

      noteChangesStarted = true;
      noteChangesPtnId = ptnId;
      var oldNoteMap = JSON.parse(JSON.stringify(pattern))._noteMap;
      oldNotes = r._noteArrayFromJSONNoteMap(oldNoteMap);
    };

    r.Edit.endNoteChanges = function() {
      if (!noteChangesStarted) {
        console.log("[Rhombus.Edit.endNoteChanges] - note changes not started or were canceled");
        return;
      }

      var changedPtnId = noteChangesPtnId;
      var changedNotes = oldNotes;

      noteChangesStarted = false;
      oldNotes = undefined;
      noteChangesPtnId = undefined;
      r.Undo._addUndoAction(function() {
        var pattern = r._song._patterns[changedPtnId];
        pattern.deleteNotes(pattern.getAllNotes());
        for (var noteIdx = 0; noteIdx < changedNotes.length; noteIdx++) {
          var note = changedNotes[noteIdx];
          pattern.addNote(note);
        }
      });
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

      pattern._automation.insert(time, new Rhombus.AutomationEvent(time, value, r));

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

      var dstPtn = new Rhombus.Pattern(r);

      srcPtn._noteMap._avl.executeOnEveryNode(function (node) {
        for (var i = 0; i < node.data.length; i++) {
          var srcNote = node.data[i];
          var dstNote = new Rhombus.Note(srcNote._pitch,
                                         srcNote._start,
                                         srcNote._length,
                                         srcNote._velocity,
                                         r);

          dstPtn.addNote(dstNote);
        }
      });

      if (srcPtn.getName().lastIndexOf("-copy") < 0) {
        dstPtn.setName(srcPtn.getName() + "-copy");
      }
      else {
        dstPtn.setName(srcPtn.getName());
      }

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

      var dstL = new Rhombus.Pattern(r);
      var dstR = new Rhombus.Pattern(r);

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
          var dstNote = new Rhombus.Note(srcNote._pitch, dstStart, dstLength, srcNote._velocity, r);
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
  this._stackSize = 1024;
  this._undoStack = [];
  this._addedListeners = [];
};

Rhombus.Undo.prototype._registerUndoAddedCallback = function(f) {
  this._addedListeners.push(f);
};

Rhombus.Undo.prototype._addUndoAction = function(f) {
  for (var listenerIdx = 0; listenerIdx < this._addedListeners.length; listenerIdx++) {
    var listener = this._addedListeners[listenerIdx];
    listener();
  }

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

Rhombus.Record = function(r) {
  this._r = r;
  this._recordBuffer = new Rhombus.Pattern(r);
  this._recordEnabled = false;
};

Rhombus.prototype.getRecordEnabled = function() {
  return this.Record._recordEnabled;
};

Rhombus.prototype.setRecordEnabled = function(enabled, item) {
  if (typeof enabled === "boolean") {
    if (isDefined(item) && enabled === true) {
      if (this.isPlaying()) {
        this.stopPlayback();
      }
      this.moveToPositionTicks(item._start);
    }
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": enabled}));
    return this.Record._recordEnabled = enabled;
  }
  else {
    document.dispatchEvent(new CustomEvent("rhombus-recordenable", {"detail": false}));
    return this.Record._recordEnabled = false;
  }
};

// Adds an RtNote with the given parameters to the record buffer
Rhombus.Record.prototype.addToBuffer = function(rtNote) {
  if (isDefined(rtNote)) {
    var noteStart  = Math.round(rtNote._start);
    var noteLength = Math.round(rtNote._end - rtNote._start);

    var note = new Rhombus.Note(rtNote._pitch,
                                noteStart,
                                noteLength,
                                rtNote._velocity,
                                this._r);

    if (isDefined(note)) {
      this._recordBuffer.addNote(note);
      document.dispatchEvent(new CustomEvent("rhombus-newbuffernote", {"detail": note}));
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
Rhombus.Record.prototype.dumpBuffer = function() {
  if (this._recordBuffer.length < 1) {
    return undefined;
  }

  return this._recordBuffer.getAllNotes();
};

Rhombus.Record.prototype.clearBuffer = function() {
  this._recordBuffer.deleteNotes(this._recordBuffer.getAllNotes());
};

//! rhombus.midi.js
//! authors: Spencer Phippen, Tim Grant
//! license: MIT

Rhombus.Midi = function(r) {
  this._r = r;
  this._midi = null;
  this._inputMap = {};
};

// Returns a MIDI Type 1 header chunk based on the current song
Rhombus.Midi.prototype.makeHeaderChunk = function() {
  var arr = new Uint8Array(14);

  // ['M', 'T', 'r', 'k'] header
  arr.set([77, 84, 104, 100], 0);

  // number of data bytes in chunk
  arr.set(intToBytes(6), 4);

  // specify Type 1 format
  arr.set(intToBytes(1).slice(2), 8);

  // specify the number of tracks
  arr.set(intToBytes(this._r.getSong().getTracks().length()).slice(2), 10);

  // specify the timebase resolution
  arr.set(intToBytes(480).slice(2), 12);

  return arr;
};

// Exports the current song structure to a raw byte array in Type 1 MIDI format
// Only the note data is exported, no tempo or time signature information
Rhombus.Midi.prototype.getRawMidi = function() {
  // render each Rhombus track to a MIDI track chunk
  var mTrks    = [];
  var numBytes = 0;
  var r = this._r;
  var that = this;
  r._song._tracks.objIds().forEach(function(trkId) {
    var track = r._song._tracks.getObjById(trkId);
    var trkChunk = that.eventsToMTrk(track.exportEvents());
    mTrks.push(trkChunk);
    numBytes += trkChunk.length;
  });

  var header = this.makeHeaderChunk();

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
Rhombus.Midi.prototype.exportSong = function() {
  var rawMidi = this.getRawMidi();
  document.dispatchEvent(new CustomEvent("rhombus-exportmidi", {"detail": rawMidi}));
};

// Converts a list of track events to a MIDI Track Chunk
Rhombus.Midi.prototype.eventsToMTrk = function(events) {
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

Rhombus.prototype.getMidiAccess = function() {
  var that = this;

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
      that.stopPreviewNote(pitch);
    }

    // check for note-on messages
    else if (cmd === 0x90 && vel > 0) {
      vel /= 127;
      console.log("[MidiIn] - Note-On, pitch: " + pitch + "; velocity: " + vel.toFixed(2));
      that.startPreviewNote(pitch, vel);
    }

    // don't worry about other message types for now
  }


  function mapMidiInputs(midi) {
    that.Midi._inputMap = {};
    var it = midi.inputs.entries();
    for (var entry = it.next(); !entry.done; entry = it.next()) {
      var value = entry.value;
      console.log("[MidiIn] - mapping entry " + value[0]);
      that.Midi._inputMap[value[0]] = value[1];
      value[1].onmidimessage = onMidiMessage;
    }
  }

  function onMidiSuccess(midiAccess) {
    console.log("[Rhombus] - MIDI Access Successful");
    that.Midi._midi = midiAccess;
    mapMidiInputs(that.Midi._midi);
  }

  function onMidiFailure(msg) {
    console.log("Failed to get MIDI access - " + msg );
  }


  this.Midi._midi = null;
  if (typeof navigator.requestMIDIAccess !== "undefined") {
    navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFailure);
  }
};

Rhombus.prototype.enableMidi = function() {
  this.getMidiAccess();
};
