/* JavaScript Library for drawing things in the denoto parameter automation component */

// draws a pin at the specified tick. Height determined by value: 0.0 = bottom, 1.0 = top.
function drawPin(context, value, tick, displaySettings){
	drawNeedle(context, value, tick, displaySettings);
	drawHead(context, value, tick, displaySettings);
}

function drawHead(context, value, tick, displaySettings, outlineColor, fillColor){
	var x = Math.round(tick / displaySettings.TPP);
	var y = 80 - Math.round(value * 80);
	
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
	var y = 80 - Math.round(value * 80);

	context.beginPath();
	context.moveTo(x, 80);
	context.lineTo(x, y);
	context.lineWidth = 1;
	context.strokeStyle = outlineColor;
	context.stroke();
	context.closePath();
}

function drawBlock(context, value, tick, displaySettings, outlineColor, fillColor){
	var tickstart = Math.floor(tick / displaySettings.quantization) * displaySettings.quantization;
	var x = Math.round(tickstart / displaySettings.TPP);
	var height = Math.round(value * 80);
	var y = 80 - height;
	var width = Math.round(displaySettings.quantization / displaySettings.TPP);

	context.beginPath();
	context.rect(x-1, y-1, width-1, height);
	context.lineWidth = 3;
	context.strokeStyle = outlineColor;
	context.stroke();
	context.fillStyle = fillColor;
	context.fill();
	context.closePath();
}