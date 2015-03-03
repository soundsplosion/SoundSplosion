function getPlayerElement(tag, element, trackID) {
  var element = tag + "[id='" +  element + "_" + trackID + "']";
  return $(element);
}

function playClicked(trackID) {
  window['rhom-' + trackID].startPlayback();
  // Switch to pause icon
  document.getElementById("play_" + trackID).style.display = "none";

  if (document.URL.slice(-1) == "/") {
    document.getElementById("pause_" + trackID).style.display = "";
  } else {
    document.getElementById("pause_" + trackID).style.display = "list-item";
  }
}

function stopClicked(trackID) {
  window['rhom-' + trackID].stopPlayback();
  window['rhom-' + trackID].moveToPositionSeconds(0);

  document.getElementById("pause_" + trackID).style.display = "none";
  if (document.URL.slice(-1) == "/") {
    document.getElementById("play_" + trackID).style.display = "";
  } else {
    document.getElementById("play_" + trackID).style.display = "list-item";
  }
}

function pauseClicked(trackID) {
  document.getElementById("pause_" + trackID).style.display = "none";
  if (document.URL.slice(-1) == "/") {
    document.getElementById("play_" + trackID).style.display = "";
  } else {
    document.getElementById("play_" + trackID).style.display = "list-item";
  }

  window['rhom-' + trackID].stopPlayback();
}

// TODO: change the button image to reflect the loop enable state
function repeatClicked(trackID) {
  window['rhom-' + trackID].setLoopEnabled(!window['rhom-' + trackID].getLoopEnabled());
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