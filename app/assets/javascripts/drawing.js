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

function drawLoop(context, loopbar, displaySettings){
	context.globalAlpha=0.5;

	if(typeof loopbar !== 'undefined'){
		drawRect(context, {left: (loopbar.start / displaySettings.TPP)+1, top: 4, right: ((loopbar.end - loopbar.start) / displaySettings.TPP)-2, bottom: 23}, "#66FF66", "#006600", 3);
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
	var times = 0;
	for(var i = 26; i < height; i += 23){
		times++;
		if(on && times !== 7 && times !== 12){
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
		if(times === 7 || times === 12){
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
		for(var i = 0.0; i < width; i += (120.0 / displaySettings.TPP)){
			context.beginPath();
			context.linewidth = 5;
			context.moveTo(i, 0);
			context.lineTo(i, height);
			if(i % (480 / displaySettings.TPP) === 0.0){
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
	drawMeasureBar(root, canvas.getAttribute("width"), 30, displaySettings);
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


function clearLoops(context, width, height){
	context.clearRect(0, 0, width, height);
}

function drawMeasureBar(root, width, height, displaySettings){
	var canvas = root.querySelector('#measurebar');
	var context = canvas.getContext("2d");

	// clear the existing image;
	clearLoops(context, width, height);

	// fill the canvas background
	context.beginPath();
	context.rect(0, 0, width-1, height-1);
	context.fillStyle = "#EEEEEE";
	context.fill();

	// draw the measure bars across the top
	for(var i = 0.0; i < width; i += (120.0 / displaySettings.TPP)){
		context.beginPath();
		if(i % (480 / displaySettings.TPP) === 0.0){
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