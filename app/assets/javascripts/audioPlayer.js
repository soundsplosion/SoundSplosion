function getPlayerElement(tag, element, title) {
  var element = tag + "[id='" +  element + "_" + title + "']";
  return $(element);
}

function playClicked(title) {
  window['rhom-' + title].startPlayback();
  // Switch to pause icon
  document.getElementById("play_" + title).style.display = "none";
  document.getElementById("pause_" + title).style.display = "list-item";
}

function stopClicked(title) {
  window['rhom-' + title].stopPlayback();
  window['rhom-' + title].moveToPositionSeconds(0);
  // Change pause icon to play icon
  document.getElementById("play_" + title).style.display = "list-item";
  document.getElementById("pause_" + title).style.display = "none";
}

function pauseClicked(title) {
  document.getElementById("play_" + title).style.display = "list-item";
  document.getElementById("pause_" + title).style.display = "none";
  window['rhom-' + title].stopPlayback();
}

function formatTime(time) {
  var min = ("0" + parseInt(time/60)).slice(-2);
  var sec = ("0" + parseInt(time-(min * 60), 10)).slice(-2);
  return min + ":" + sec;
}

function songFinished(current, end) {
  return current > end;
}

function getTrackProgress(current, end) {
  var progress = (current/end) * 100 <= 100 ? (current/end) * 100 : 100;
  return progress.toString() + "%";
}