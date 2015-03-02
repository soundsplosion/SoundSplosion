/* JavaScript Library for drawing things in the denoto effects graph */

// draws an arrow from the exit (right side) of an ancestor to the entry (left side) of a successor
function drawArrow(canvas, context, ancestorElement, successorElement, color){
	var exit = getExitPoint(canvas, ancestorElement);
	var entry = getEntryPoint(canvas, successorElement);

	context.beginPath();
	context.moveTo(exit.x, exit.y);
	context.lineTo(entry.x, entry.y);
	context.lineWidth = 3;
	context.strokeStyle = color;
	context.stroke();
	context.closePath();
}

// gets the point arrows leaving the node should start from
function getExitPoint(canvas, element){
	var rect = element.getBoundingClientRect();
	var offset = canvas.getBoundingClientRect();
	var x = rect.left + rect.width + offset.left;
	var y = rect.top + Math.round(rect.height / 2) - offset.top;

	return {x: x, y: y};
}

// gets the point arrows entering the node should end at
function getEntryPoint(canvas, element){
	var rect = element.getBoundingClientRect();
	var offset = canvas.getBoundingClientRect();
	var x = rect.left + offset.left;
	var y = rect.top + Math.round(rect.height / 2) - offset.top;

	return {x: x, y: y};
}