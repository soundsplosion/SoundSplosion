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
	if(typeof note !== 'undefined')
		drawRect(context, {left: (note.tickstart / 3)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / 3)-2, bottom: 19}, note.color, note.outlinecolor, 5);
}

function drawSelectedNote(context, note){
	//var color = (note.color == "#6666AA") ? "#333366" : "#444488";
	var color = "#333366";
	if(typeof note !== 'undefined')
		drawRect(context, {left: (note.tickstart / 3)+1, top: (note.keyValue * 23 + 5), right: (note.tickduration / 3)-2, bottom: 19}, color, note.outlinecolor, 5);
}
function eraseNote(context, note){
	if(typeof note !== 'undefined')
		context.clearRect((note.tickstart / 3), (note.keyValue * 23 + 5)-1, (note.tickduration / 3), 21);
}