var timer = null;
function getPlayerElement(tag, element, trackID) {
  var element = tag + "[id='" +  element + "_" + trackID + "']";
  return $(element);
}

function playClicked(trackID) {
  $.ajax({
    url: "/uploads/" + trackID,
    async: false,
    dataType: 'JSON',
    success: function(data) {
      window["denoto_rhomb"].importSong(JSON.stringify(data));
      window["denoto_rhomb"].setLoopStart(0);
      window["denoto_rhomb"].stopPlayback();
      window["denoto_rhomb"].moveToPositionSeconds(0);
      window["denoto_rhomb"].setLoopEnd( window["denoto_rhomb"].getSong().getLength());
      window["denoto_rhomb"].Undo._clearUndoStack();
      window["denoto_rhomb"].startPlayback();

      // Switch to pause icon
      document.getElementById("play_" + trackID).style.display = "none";

      if (document.URL.slice(-1) == "/") {
        document.getElementById("pause_" + trackID).style.display = "";
      } else {
        document.getElementById("pause_" + trackID).style.display = "list-item";
      }

      timer = setInterval(function() {
        // Update track current time
        var time = window["denoto_rhomb"].getPosition();
        getPlayerElement("div", "currentTime", trackID).html(formatTime(time));

        // Update track progress bar
        getPlayerElement("a", "progress", trackID).css("left", getTrackProgress(time, window["denoto_rhomb"].getSongLengthSeconds()));

        // Clean up after the song finishes
        if(songFinished(time, window["denoto_rhomb"].getSongLengthSeconds())) {
          stopClicked(trackID);
          getPlayerElement("div", "currentTime", trackID).html("00:00");
        }
      }, 1000);
    },
    error: function (request, status, error) {
        console.log(request);
        console.log(status);
        console.log(error);
    }
  });
}

function stopClicked(trackID) {
  clearInterval(timer);
  window["denoto_rhomb"].stopPlayback();
  window["denoto_rhomb"].moveToPositionSeconds(0);

  var time = window["denoto_rhomb"].getPosition();
  getPlayerElement("div", "currentTime", trackID).html(formatTime(time));

  // Update track progress bar
  getPlayerElement("a", "progress", trackID).css("left", getTrackProgress(time, window["denoto_rhomb"].getSongLengthSeconds()));

  document.getElementById("pause_" + trackID).style.display = "none";
  if (document.URL.slice(-1) == "/") {
    document.getElementById("play_" + trackID).style.display = "";
  } else {
    document.getElementById("play_" + trackID).style.display = "list-item";
  }
}

function pauseClicked(trackID) {
  clearInterval(timer);
  document.getElementById("pause_" + trackID).style.display = "none";
  if (document.URL.slice(-1) == "/") {
    document.getElementById("play_" + trackID).style.display = "";
  } else {
    document.getElementById("play_" + trackID).style.display = "list-item";
  }

  window["denoto_rhomb"].stopPlayback();
}

// TODO: change the button image to reflect the loop enable state
function repeatClicked(trackID) {
  window["denoto_rhomb"].setLoopEnabled(!window["denoto_rhomb"].getLoopEnabled());
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