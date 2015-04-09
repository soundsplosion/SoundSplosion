/* JavaScript Library for drawing things in the denoto effects graph */

// draws an arrow from the exit (right side) of an ancestor to the entry (left side) of a successor
function drawArrow(canvas, context, ancestorElement, successorElement, color, entry_offset, exit_offset){
	if(typeof entry_offset === 'undefined')
		entry_offset = {x: 0, y: 0};
	if(typeof exit_offset === 'undefined')
		exit_offset = {x: 0, y: 0};

	var offset = canvas.getBoundingClientRect();
	offset.left += 125; // canvas starts 125 pixels from the left side of the screen due to the tracklist
	var exit = getCenterPoint(offset, ancestorElement);
	var entry = getCenterPoint(offset, successorElement);
	entry.x += entry_offset.x;
	entry.y += entry_offset.y;
	exit.x += exit_offset.x;
	exit.y += exit_offset.y;

	context.beginPath();
	context.moveTo(exit.x, exit.y);
	context.lineTo(entry.x, entry.y);
	context.lineWidth = 3;
	context.strokeStyle = color;
	context.stroke();
	context.closePath();
}

// draws an arrow from an ancestor to an arbitrary canvas point
function drawArrowToPoint(canvas, context, ancestorElement, point, color){
	var offset = canvas.getBoundingClientRect();
	offset.left += 125; // canvas starts 125 pixels from the left side of the screen due to the tracklist
	var exit = getCenterPoint(offset, ancestorElement);
	var entry = point;

	context.beginPath();
	context.moveTo(exit.x, exit.y);
	context.lineTo(entry.x, entry.y);
	context.lineWidth = 3;
	context.strokeStyle = color;
	context.stroke();
	context.closePath();
}

// gets the point arrows leaving the node should start from
function getExitPoint(offset, element){
	var rect = element.getBoundingClientRect();
	var x = rect.left + rect.width - offset.left;
	var y = rect.top + Math.round(rect.height / 2) - offset.top;

	return {x: x, y: y};
}

// gets the point arrows entering the node should end at
function getEntryPoint(offset, element){
	var rect = element.getBoundingClientRect();
	var x = rect.left - offset.left;
	var y = rect.top + Math.round(rect.height / 2) - offset.top;

	return {x: x, y: y};
}

// gets the point arrows pointing to the center of the element should end at
function getCenterPoint(offset, element){
	var rect = element.getBoundingClientRect();
	var x = rect.left + Math.round(rect.width / 2) - offset.left;
	var y = rect.top + Math.round(rect.height / 2) - offset.top;

	return {x: x, y: y};
}