/* JavaScript Library for drawing things in SoundSplosion */

function drawRect(context, coords, fillcolor, linecolor, linewidth){
	context.beginPath();
	context.rect(coords.left, coords.top, coords.right, coords.bottom);
	context.fillStyle = fillcolor;
	context.fill();
	context.linewidth = linewidth;
	context.strokeStyle = linecolor;
	context.stroke();
}