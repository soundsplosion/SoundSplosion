/* JavaScript Library for drawing things in denoto */

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
	if(typeof loopbar !== 'undefined')
		context.clearRect(Math.floor(loopbar.start / displaySettings.TPP)-2, 3, Math.floor((loopbar.end - loopbar.start) / displaySettings.TPP)+5, 25);
}

function drawNote(context, note, displaySettings){
	context.globalAlpha=0.75;

	if(typeof note !== 'undefined'){
		eraseNote(context, note, displaySettings);
		drawRect(context, {left: (note.tickstart / displaySettings.TPP)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / displaySettings.TPP)-2, bottom: 19}, note.color, note.outlinecolor, 3);
	}
}

function drawSelectedNote(context, note, displaySettings){
	context.globalAlpha=0.75;

	var color = "#333366";
	if(typeof note !== 'undefined'){
		eraseNote(context, note, displaySettings);
		drawRect(context, {left: (note.tickstart / displaySettings.TPP)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / displaySettings.TPP)-2, bottom: 19}, color, note.outlinecolor, 5);
	}
}

function eraseNote(context, note, displaySettings){
	if(typeof note !== 'undefined')
		context.clearRect(Math.floor(note.tickstart / displaySettings.TPP), (note.keyValue * 23 + 5)-1, Math.floor(note.tickduration / displaySettings.TPP)+1, 21);
}

function drawCanvas(context, width, height, displaySettings){
	// fill the canvas background
	context.beginPath();
	context.rect(1, 1, width-2, height-2);
	context.fillStyle = "#EEEEEE";			
	context.fill();

	// draw the black key bars
	var on = true;
	//var times = -1;
	var times = 4;
	for(var i = 26; i < height; i += 23){
		times++;
		if(on && times !== 0 && times !== 7 && times !== 12){
			context.beginPath()
			context.rect(0, i, width, 23);
			context.linewidth = 5;
			context.strokeStyle = "#000000";
			context.fillStyle = "#BBBBBB";
			context.fill();
			//context.stroke();
			on = false;
		} else {
			on = true;
		}
		if(times == 0 || times === 7 || times === 12){
			context.beginPath()
			context.moveTo(0, i);
			context.lineTo(width, i);
			context.linewidth = 2;
			context.strokeStyle = "#777777";
			context.fillStyle = "#BBBBBB";
			context.fill();
			context.stroke();
		}
		if(times > 12){
			times = 1;
			//on = true;
		}
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
			context.linewidth = 5;
			context.moveTo(i, 0);
			context.lineTo(i, height);
			if(i % meas_disp === 0.0){
				context.strokeStyle = "#2222AA";
			} else if(i % beat_disp === 0.0){
				context.strokeStyle = "#000000";
			} else {
				context.strokeStyle = "#666666";
			}
			context.fill();
			context.stroke();
		}
	}

	// outline the canvas
	context.beginPath();
	context.rect(1, 1, width-2, height-2);
	context.linewidth = 5;
	context.strokeStyle = "#000000";
	context.stroke();
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

function redrawAllNotes(root, noteset, displaySettings){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	context.globalAlpha=0.75;

	// clear the canvas
	context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

	// draw each note individually
	for(var i = 0; i < noteset.lanes.length; i++){
		var lane = noteset.lanes[i];
		for(var index in lane){
			drawNote(context, lane[index], displaySettings);
		}
	}

	// draw the selected notes as selected
	for(var index in noteset.selectedSet){
		drawSelectedNote(context, noteset.selectedSet[index], displaySettings);
	}

	// draw the currently selected note
	drawSelectedNote(context, noteset.currentNote, displaySettings);
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
		context.linewidth = 2;
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
			context.linewidth = 5;
			context.moveTo(i, 0);
			context.lineTo(i, height);
			if(i % meas_disp === 0.0){
				context.strokeStyle = "#2222AA";
			} else if(i % beat_disp === 0.0){
				context.strokeStyle = "#000000";
			} else {
				context.strokeStyle = "#666666";
			}
			context.fill();
			context.stroke();
		}
	}

	// outline the canvas
	context.beginPath();
	context.rect(1, 1, width-2, height-2);
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

	for(var i = 0.0; i < width; i += incr){
		context.beginPath();
		if(i % meas_disp === 0.0){
			context.linewidth = 8;
			context.strokeStyle = "#2222AA";
			context.moveTo(i, 0);
		} else	if(i % beat_disp === 0.0){
			context.linewidth = 8;
			context.strokeStyle = "#000000";
			context.moveTo(i, 0);
		} else {
			context.linewidth = 5;
			context.strokeStyle = "#666666";
			context.moveTo(i, height / 2);
		}
		context.lineTo(i, height);
		context.stroke();
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