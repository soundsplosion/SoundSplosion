function ticks_to_musical_time(_ticks, isPos){ //, displaySettings){
  var ticks = _ticks;
  var offset = (isDefined(isPos) && isPos) ? 1 : 0;

  var beat_ticks = Math.floor((480 * 4) / 4); //displaySettings.timesig_den);
  var measure_ticks = beat_ticks * 4; // displaySettings.timesig_num;
  var q_beat_ticks = Math.floor(beat_ticks / 4);
  var beat, q_beat;

  var measure = Math.floor(ticks / measure_ticks) + offset;
  ticks = ticks % measure_ticks;

  beat = Math.floor(ticks / beat_ticks) + offset;
  ticks = ticks % beat_ticks;

  q_beat = Math.floor(ticks / q_beat_ticks) + offset;
  ticks = ticks % q_beat_ticks;

  ticks = Math.floor(ticks);

  return {"measure": measure, "beat": beat, "quarter_beat": q_beat, "ticks": ticks};
}

function ticksToString(ticks, isPos){
  var clock = ticks_to_musical_time(ticks, isPos);
  var measure = (clock.measure + "" === "") ? "0" : clock.measure;
  var beat = (clock.beat + "" === "") ? "0" : clock.beat;
  var quarter_beat = (clock.quarter_beat + "" === "") ? "0" : clock.quarter_beat;
  var ticks = (clock.ticks + "" === "") ? "0" : clock.ticks;
  return (measure + "." + beat + "." + quarter_beat + "." + ticks);
}

function stringToTicks(timeString, isPos) {
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
}

function musical_time_to_ticks(musical_time){ //, displaySettings){
  var ticks = musical_time.ticks;

  var beat_ticks = Math.floor((480 * 4) / 4); //displaySettings.timesig_den);
  var measure_ticks = beat_ticks * 4; // displaySettings.timesig_num;
  var q_beat_ticks = Math.floor(beat_ticks / 4);

  ticks += (musical_time.quarter_beat - 1) * q_beat_ticks;
  ticks += (musical_time.beat - 1) * beat_ticks;
  ticks += (musical_time.measure - 1) * measure_ticks;

  return ticks;
}

function get_musical_time(clock){
  return {"measure": parseInt(clock.measure.getAttribute("value")), "beat": parseInt(clock.beat.getAttribute("value")), "quarter_beat": parseInt(clock.q_beat.getAttribute("value")), "ticks": parseInt(clock.ticks.getAttribute("value"))};
}

function Clock(measure, beat, q_beat, ticks){
  this.measure = measure;
  this.beat = beat;
  this.q_beat = q_beat;
  this.ticks = ticks;

  return this;
}

Clock.prototype.getTicks = function(){
  return musical_time_to_ticks(get_musical_time(this));
};

Clock.prototype.setTicks = function(ticks){
    var time = ticks_to_musical_time(ticks);

    this.measure.setAttribute("value", time.measure);
    this.beat.setAttribute("value", time.beat);
    this.q_beat.setAttribute("value", time.quarter_beat);
    this.ticks.setAttribute("value", time.ticks);
};