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

function drawNote(context, note){
	drawRect(context, {left: (note.tickstart / 3), top: (note.keyValue * 23 + 3), right: (note.tickduration / 3), bottom: 23}, note.color, "#000044", 5);
}

function drawSelectedNote(context, note){
	drawRect(context, {left: (note.tickstart / 3), top: (note.keyValue * 23 + 3), right: (note.tickduration / 3), bottom: 23}, "#66FF66", "#000044", 5);
}
function eraseNote(context, note){
	context.clearRect((note.tickstart / 3) - 1, (note.keyValue * 23 + 3)-1, (note.tickduration / 3)+2, 25);
}