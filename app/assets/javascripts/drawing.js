/* JavaScript Library for drawing things in denoto */

var keyboardnotes = 127;

function drawRect(context, coords, fillcolor, linecolor, linewidth){
	context.beginPath();
	context.rect(Math.ceil(coords.left)+1, Math.ceil(coords.top), Math.floor(coords.right), Math.floor(coords.bottom));
	context.fillStyle = fillcolor;
	context.fill();

	context.rect(Math.ceil(coords.left), Math.ceil(coords.top), Math.floor(coords.right), Math.floor(coords.bottom));
	context.linewidth = linewidth;
	context.strokeStyle = linecolor;
	context.stroke();
}

function drawNoteRect(context, coords, fillcolor){
	var left = Math.ceil(coords.left);
	var top = Math.ceil(coords.top);
	var right = Math.floor(coords.right);
	var bottom = Math.floor(coords.bottom);

	context.beginPath();
	context.rect(left, top, right, bottom);
	context.fillStyle = fillcolor;
	context.fill();

	context.beginPath()
	context.moveTo(left, top);
	context.lineTo(left, top + bottom);
	context.moveTo(left + right, top);
	context.lineTo(left + right, top + bottom);
	context.lineWidth = 1.5;
	context.strokeStyle = "#000000";
	context.stroke();
}

function drawPattern(context, pattern, displaySettings){
	context.globalAlpha=0.75;

	if(typeof pattern !== 'undefined'){
		erasePattern(context, pattern, displaySettings);
		var color = rhomb.getSong().getPatterns()[pattern._ptnId].getColor();
		drawRect(context, {left: (pattern.getStart() / displaySettings.TPP)+1, top: (pattern.getTrackIndex() * 80 + 2), right: (pattern.getLength() / displaySettings.TPP)-2, bottom: 77}, color, "#000000", 3);
	}
}

function drawPatternPreview(context, pattern, displaySettings){
	context.globalAlpha=0.5;

	if(typeof pattern !== 'undefined'){
//erasePattern(context, pattern, displaySettings);
var color = rhomb.getSong().getPatterns()[pattern._ptnId].getColor();
drawRect(context, {left: (pattern.getStart() / displaySettings.TPP)+1, top: (pattern.getTrackIndex() * 80 + 2), right: (pattern.getLength() / displaySettings.TPP)-2, bottom: 77}, color, "#000000", 3);
}
}

function drawSelectedPattern(context, pattern, displaySettings){
	context.globalAlpha=0.75;

	var color = "#333366";
	if(typeof pattern !== 'undefined'){
		erasePattern(context, pattern, displaySettings);
		var color = rhomb.getSong().getPatterns()[pattern._ptnId].getColor();
		drawRect(context, {left: (pattern.getStart() / displaySettings.TPP)+1, top: (pattern.getTrackIndex() * 80 + 2), right: (pattern.getLength() / displaySettings.TPP)-2, bottom: 77}, color, "#000000", 5);
	}
}

function erasePattern(context, pattern, displaySettings){
	if(typeof pattern !== 'undefined')
		context.clearRect(Math.floor(pattern.getStart() / displaySettings.TPP), (pattern.getTrackIndex() * 80 + 2)-1, Math.floor(pattern.getLength() / displaySettings.TPP)+1, 79);
}

function drawLoop(context, loopbar, displaySettings){
	context.globalAlpha=0.5;

	var start = loopbar.start;
	var end = loopbar.end;

	if(typeof displaySettings.startOffsetTicks !== 'undefined'){
		start = loopbar.start - displaySettings.startOffsetTicks;
		end = loopbar.end - displaySettings.startOffsetTicks;
	}

	if(start < 0)
		start = 0;
	if(end < 0)
		end = 0;

	if(typeof loopbar !== 'undefined' && displaySettings.loopEnabled){
		drawRect(context, {left: (start / displaySettings.TPP)+1, top: 4, right: ((end - start) / displaySettings.TPP)-2, bottom: 23}, "#66FF66", "#006600", 3);
	}
}

function eraseLoop(context, loopbar, displaySettings){
	var start = loopbar.start;
	var end = loopbar.end;

	if(typeof displaySettings.startOffsetTicks !== 'undefined'){
		start = loopbar.start - displaySettings.startOffsetTicks;
		end = loopbar.end - displaySettings.startOffsetTicks;
	}

	if(start < 0)
		start = 0;
	if(end < 0)
		end = 0;

	if(typeof loopbar !== 'undefined')
		context.clearRect(Math.floor(start / displaySettings.TPP)-2, 3, Math.floor((end - start) / displaySettings.TPP)+5, 25);
}

function drawNote(context, note, displaySettings){
	if(typeof note !== 'undefined'){
		//eraseNote(context, note, displaySettings);
		var color = note.getSelected() ? "#333366" : "#6666AA";
		drawNoteRect(context, {left: (note.getStart() / displaySettings.TPP)+1, top: (keyboardnotes - note.getPitch()), right: (note.getLength() / displaySettings.TPP)-2, bottom: 1}, color);
	}
}

function drawSelectedNote(context, note, displaySettings){
	if(typeof note !== 'undefined'){
		eraseNote(context, note, displaySettings);
		drawNoteRect(context, {left: (note.getStart() / displaySettings.TPP)+1, top: (keyboardnotes - note.getPitch()), right: (note.getLength() / displaySettings.TPP)-2, bottom: 1}, "#333366");
	}
}

function drawPreviewNote(context, note, displaySettings){
	if(typeof note !== 'undefined'){
		var color = note.getSelected() ? "#333366" : "#6666AA";
		drawNoteRect(context, {left: (note.getStart() / displaySettings.TPP)+1, top: (keyboardnotes - note.getPitch()), right: (note.getLength() / displaySettings.TPP)-2, bottom: 1}, "#444444");
	}
}

function eraseNote(context, note, displaySettings){
	if(typeof note !== 'undefined')
		context.clearRect(Math.floor(note.getStart() / displaySettings.TPP)+1, (keyboardnotes - note.getPitch()), Math.floor(note.getLength() / displaySettings.TPP)-2, 1);
}

function drawCanvas(context, width, height, displaySettings){
	// fill the canvas background
	context.beginPath();
	//context.rect(0, 0, width-1, height);
	context.rect(0, 0, width, height);
	context.fillStyle = "#EEEEEE";			
	context.fill();

	// draw the black key bars
	var on = false;
	var times = 1;
	for(var i = -13; i < height; i += 23){
		times++;
		if(on && times !== 0 && times !== 7 && times !== 12){
			context.beginPath()
			context.rect(-1, i, width+1, 23);
			context.lineWidth = 1;
			context.strokeStyle = "#000000";
			context.fillStyle = "#BBBBBB";
			context.fill();
			context.stroke();
			on = false;
		} else {
			on = true;
		}
		if(times == 0 || times === 7 || times === 12){
			context.beginPath()
			context.moveTo(0, i);
			context.lineTo(width, i);
			context.lineWidth = 1;
			context.strokeStyle = "#000000";
			context.fillStyle = "#BBBBBB";
			context.fill();
			context.stroke();
		}
		if(times > 12){
			times = 1;
		}
	}

	// draw the measure bars if guides are to be shown
	if(displaySettings.showguides){
		var incr = displaySettings.quantization / displaySettings.TPP;
		var beat = Math.floor((480 * 4) / displaySettings.timesig_den);
		var measure = displaySettings.timesig_num * beat;

		var beat_disp = beat / displaySettings.TPP;
		var meas_disp = measure / displaySettings.TPP;

		var d = (typeof displaySettings.startOffsetTicks !== 'undefined') ? displaySettings.startOffsetTicks : 0;
		var start = (d / displaySettings.TPP);
		var delta = start % incr;
		var end = start + parseInt(width) - delta;

		for(var i = start - delta; i <= end; i += incr){
			context.beginPath();
			context.moveTo(i - start, 0);
			context.lineTo(i - start, height);
			if(i % meas_disp === 0.0){
				context.lineWidth = 2;
				context.strokeStyle = "#000000";
			} else if(i % beat_disp === 0.0){
				context.lineWidth = 1;
				context.strokeStyle = "#000000";
			} else {
				context.lineWidth = 1;
				context.strokeStyle = "#666666";
			}
			context.fill();
			context.stroke();
		}
	}
}

function redrawCanvas(root, displaySettings){
	var canvas = root.querySelector('#bgCanvas');
	var context = canvas.getContext("2d");

// clear the canvas
context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

// redraw the canvas
drawCanvas(context, canvas.getAttribute("width"), canvas.getAttribute("height"), displaySettings)

// redraw the measure bar
drawMeasureBar(root, displaySettings);
}

function redrawAllNotes(root, notes, displaySettings){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	context.globalAlpha=0.75;

	// clear the canvas
	context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

	for(var i in notes){
		drawNote(context, notes[i], displaySettings);
	}
}

function previewNotes(root, notes, displaySettings){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	context.globalAlpha=0.5;

	for(var i in notes){
		drawPreviewNote(context, notes[i], displaySettings);
	}
}

function drawNotes(root, notes, displaySettings){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	context.globalAlpha=0.75;

	for(var i in notes){
		drawNote(context, notes[i], displaySettings);
	}
}

function drawTracksCanvas(context, width, height, displaySettings){
// fill the canvas background
context.beginPath();
context.rect(1, 1, width-2, height-2);
context.fillStyle = "#EEEEEE";			
context.fill();

// draw the track separators
for(var i = 0; i < height; i += 80){
	context.beginPath()
	context.moveTo(0, i);
	context.lineTo(width, i);
	context.lineWidth = 1;
	context.strokeStyle = "#777777";
	context.fillStyle = "#BBBBBB";
	context.fill();
	context.stroke();
}

// draw the measure bars if guides are to be shown
if(displaySettings.showguides){
	var incr = displaySettings.quantization / displaySettings.TPP;
	var beat = Math.floor((480 * 4) / displaySettings.timesig_den);
	var measure = displaySettings.timesig_num * beat;

	var beat_disp = beat / displaySettings.TPP;
	var meas_disp = measure / displaySettings.TPP;

	for(var i = 0.0; i < width; i += incr){
		context.beginPath();
		context.moveTo(i, 0);
		context.lineTo(i, height - 80); // 80 subtracted to prevent measure lines from appearing in the "add track" lane
		if(i % meas_disp === 0.0){
			context.lineWidth = 2;
			context.strokeStyle = "#000000";
		} else if(i % beat_disp === 0.0){
			context.lineWidth = 1;
			context.strokeStyle = "#000000";
		} else {
			context.lineWidth = 1;
			context.strokeStyle = "#666666";
		}
		context.fill();
		context.stroke();
	}
}

// outline the canvas
context.beginPath();
context.rect(1, 1, width-2, height-82);
context.linewidth = 5;
context.strokeStyle = "#000000";
context.stroke();
}

function redrawTracksCanvas(root, displaySettings){
	var canvas = root.querySelector('#bgCanvas');
	var context = canvas.getContext("2d");

// clear the canvas
context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

// redraw the canvas
drawTracksCanvas(context, canvas.getAttribute("width"), canvas.getAttribute("height"), displaySettings)

// redraw the measure bar
drawMeasureBar(root, displaySettings);
}

function redrawAllPatterns(root, rhomb, trackset, displaySettings){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	context.globalAlpha=0.75;

// clear the canvas
context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

// draw each track individually
for(var i = 0; i < rhomb.getSong().getTracks().length(); i++){
	var playlist = rhomb.getSong().getTracks().getObjBySlot(i).getPlaylist();
	for(var index in playlist){
		drawPattern(context, playlist[index], displaySettings);
	}
}

// draw the selected tracks as selected
for(var index in trackset.selectedSet){
	drawSelectedPattern(context, trackset.selectedSet[index], displaySettings);
}

// draw the currently selected track
drawSelectedPattern(context, trackset.currentPattern, displaySettings);
}


function clearMeasureBar(context, width, height){
	context.clearRect(0, 0, width, height);
}

function drawMeasureBar(root, displaySettings){
	var canvas = root.querySelector('#bgMeasurebar');
	var context = canvas.getContext("2d");
	var width = canvas.getAttribute("width");
	var height = canvas.getAttribute("height");

// clear the existing image;
context.clearRect(0, 0, width, height);

// fill the canvas background
context.beginPath();
context.rect(0, 0, width-1, height-1);
context.fillStyle = "#EEEEEE";
context.fill();

// draw the measure bars across the top
var incr = displaySettings.quantization / displaySettings.TPP;
var beat = Math.floor((480 * 4) / displaySettings.timesig_den);
var measure = displaySettings.timesig_num * beat;

var beat_disp = beat / displaySettings.TPP;
var meas_disp = measure / displaySettings.TPP;

var d = (typeof displaySettings.startOffsetTicks !== 'undefined') ? displaySettings.startOffsetTicks : 0;
var start = (d / displaySettings.TPP);
var delta = start % incr;
var end = start + parseInt(width) - delta;

for(var i = start - delta; i < end; i += incr){
	context.beginPath();
	if(i % meas_disp === 0.0){
		context.lineWidth = 2;
		context.strokeStyle = "#000000";
		context.moveTo(i - start, 0);
	} else if(i % beat_disp === 0.0){
		context.lineWidth = 1;
		context.strokeStyle = "#000000";
		context.moveTo(i - start, 0);
	} else {
		context.lineWidth = 1;
		context.strokeStyle = "#666666";
		context.moveTo(i - start, height / 2);
	}
	context.lineTo(i - start, height);
	context.stroke();	

	if(i % meas_disp === 0.0){
		// draw the measure caption
		var caption = Math.floor(i / meas_disp) + 1;
		context.fillStyle = "#000000";
		context.font="11px Arial";
		context.fillText(caption, (i - start + 3), 12);
	}
}


// outline the canvas
context.beginPath();
context.rect(1, 1, width-2, height-2);
context.linewidth = 5;
context.strokeStyle = "#000000";
context.stroke();
}

function redrawOverlay(root, displaySettings){
	var canvas = root.querySelector('#overlayCanvas');
	var context = canvas.getContext("2d");
	var width = canvas.getAttribute("width");
	var height = canvas.getAttribute("height");

	// clear the existing image;
	context.clearRect(0, 0, width, height);
	context.globalAlpha = 0.75;

	drawEndmarker(root, displaySettings, displaySettings.endmarkerticks);
}

function drawEndmarker(root, displaySettings, endmarkerticks){
	var canvas = root.querySelector('#overlayCanvas');
	var context = canvas.getContext("2d");
	var width = canvas.getAttribute("width");
	var height = canvas.getAttribute("height");
	var oldmarkerpixel = Math.floor(displaySettings.endmarkerticks / displaySettings.TPP);
	var newmarkerpixel = Math.floor(endmarkerticks / displaySettings.TPP);

	if(oldmarkerpixel !== newmarkerpixel){
		var lesser = (oldmarkerpixel < newmarkerpixel) ? oldmarkerpixel : newmarkerpixel;
		context.clearRect(lesser-1, 0, (width - lesser)+1, height);
	}

	context.beginPath();
	context.rect(newmarkerpixel, 0, (width - newmarkerpixel), height);
	context.fillStyle = "#CCCCCC";
	context.fill();

	context.beginPath();
	context.rect(newmarkerpixel, 0, 2, height);
	context.fillStyle = "#000000";
	context.fill();
}

function drawTimeMarker(context, ticks, height, displaySettings){
	var effectiveticks;

	if(typeof displaySettings.startOffsetTicks !== 'undefined'){
		effectiveticks = ticks - displaySettings.startOffsetTicks;
	} else {
		effectiveticks = ticks;
	}

	context.beginPath();
	context.rect(Math.floor(effectiveticks / displaySettings.TPP), 0, 2, height);
	context.fillStyle = "#6666AA";
	context.fill();
}