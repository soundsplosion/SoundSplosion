function ticks_to_musical_time(_ticks){ //, displaySettings){
  var ticks = _ticks;

  var beat_ticks = Math.floor((480 * 4) / 4); //displaySettings.timesig_den);
  var measure_ticks = beat_ticks * 4; // displaySettings.timesig_num;
  var q_beat_ticks = Math.floor(beat_ticks / 4);
  var beat, q_beat;

  var measure = Math.floor(ticks / measure_ticks) + 1;
  ticks = ticks % measure_ticks;

  beat = Math.floor(ticks / beat_ticks) + 1;
  ticks = ticks % beat_ticks;

  q_beat = Math.floor(ticks / q_beat_ticks) + 1;
  ticks = ticks % q_beat_ticks;

  ticks = Math.floor(ticks);

  return {"measure": measure, "beat": beat, "quarter_beat": q_beat, "ticks": ticks};
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