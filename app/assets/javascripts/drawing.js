/* JavaScript Library for drawing things in denoto */

function drawRect(context, coords, fillcolor, linecolor, linewidth){
	context.beginPath();
	context.rect(coords.left, coords.top, coords.right, coords.bottom);
	context.fillStyle = fillcolor;
	context.fill();
	context.linewidth = linewidth;
	context.strokeStyle = linecolor;
	context.stroke();
}

function drawNote(context, note, TPP){
	if(typeof note !== 'undefined')
		drawRect(context, {left: (note.tickstart / TPP)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / TPP)-2, bottom: 19}, note.color, note.outlinecolor, 3);
		//drawRect(context, {left: (note.tickstart / 3)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / 3)-2, bottom: 19}, note.color, note.outlinecolor, 5);
}

function drawSelectedNote(context, note, TPP){
	//var color = (note.color == "#6666AA") ? "#333366" : "#444488";
	var color = "#333366";
	if(typeof note !== 'undefined')
		drawRect(context, {left: (note.tickstart / TPP)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / TPP)-2, bottom: 19}, color, note.outlinecolor, 5);
}

function eraseNote(context, note, TPP){
	if(typeof note !== 'undefined')
		context.clearRect((note.tickstart / TPP), (note.keyValue * 23 + 5)-1, (note.tickduration / TPP), 21);
}

function drawCanvas(context, width, height, TPP){
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

	// draw the measure bars
	for(var i = 0.0; i < width; i += (40.0 / TPP)){
		context.beginPath();
		context.linewidth = 5;
		context.moveTo(i, 0);
		context.lineTo(i, height);
		if(i % (160 / TPP) === 0.0){
			context.strokeStyle = "#000000";
		} else {
			context.strokeStyle = "#666666";
		}
		context.fill();
		context.stroke();
	}

	// outline the canvas
	context.beginPath();
	context.rect(1, 1, width-2, height-2);
	context.linewidth = 5;
	context.strokeStyle = "#000000";
	context.stroke();
}

function redrawCanvas(root, TPP){
	var canvas = root.querySelector('#bgCanvas');
	var context = canvas.getContext("2d");

	// clear the canvas
	context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));
	
	// redraw the canvas
	drawCanvas(context, canvas.getAttribute("width"), canvas.getAttribute("height"), TPP)
}

function redrawAllNotes(root, noteset, TPP){
	var canvas = root.querySelector('#fgCanvas');
	var context = canvas.getContext("2d");

	// clear the canvas
	context.clearRect(0, 0, canvas.getAttribute("width"), canvas.getAttribute("height"));

	// draw each note individually
	for(var i = 0; i < noteset.lanes.length; i++){
		var lane = noteset.lanes[i];
		for(var index in lane){
			drawNote(context, lane[index], TPP);
		}
	}

	// draw the selected notes as selected
	for(var index in noteset.selectedSet){
		drawSelectedNote(context, noteset.selectedSet[index], TPP);
	}
}