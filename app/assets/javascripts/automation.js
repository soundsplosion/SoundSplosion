/* JavaScript Library for drawing things in the denoto parameter automation component */

var AUTOMATION_HEIGHT = 75;

// draws a pin at the specified tick. Height determined by value: 0.0 = bottom, 1.0 = top.
function drawPin(context, value, tick, displaySettings){
	drawNeedle(context, value, tick, displaySettings);
	drawHead(context, value, tick, displaySettings);
}

function drawHead(context, value, tick, displaySettings, outlineColor, fillColor){
	var x = Math.round(tick / displaySettings.TPP);
	var y = AUTOMATION_HEIGHT - Math.round(value * AUTOMATION_HEIGHT);
	
	context.beginPath();
	context.arc(x, y, 3, 2 * Math.PI, false);
	context.fillStyle = fillColor;
	context.fill();
	context.strokeStyle = outlineColor;
	context.stroke();
	context.closePath();
}

function drawNeedle(context, value, tick, displaySettings, outlineColor){
	var x = Math.round(tick / displaySettings.TPP);
	var y = AUTOMATION_HEIGHT - Math.round(value * AUTOMATION_HEIGHT);

	context.beginPath();
	context.moveTo(x, AUTOMATION_HEIGHT);
	context.lineTo(x, y);
	context.lineWidth = 1;
	context.strokeStyle = outlineColor;
	context.stroke();
	context.closePath();
}

function drawBlock(context, prevValue, value, tickstart, tickend, nextValue, displaySettings, outlineColor, fillColor){
	var x = Math.round(tickstart / displaySettings.TPP);
	var height = Math.round(value * AUTOMATION_HEIGHT);
	var y = AUTOMATION_HEIGHT - height;
	var prevY = AUTOMATION_HEIGHT - Math.round(prevValue * AUTOMATION_HEIGHT);
	var nextY = AUTOMATION_HEIGHT - Math.round(nextValue * AUTOMATION_HEIGHT);
	var width = Math.round((tickend - tickstart) / displaySettings.TPP);

	context.beginPath();
	context.rect(x, y, width, height);
	context.fillStyle = fillColor;
	context.fill();
	context.closePath();

	context.beginPath();
	// left side
	context.moveTo(x, prevY);
	context.lineTo(x, y);

	// top
	context.moveTo(x, y);
	context.lineTo(x+width, y);

	// right side
	context.moveTo(x+width, y);
	context.lineTo(x+width, nextY);

	context.lineWidth = 2;
	context.strokeStyle = outlineColor;
	context.stroke();
	context.closePath();
}