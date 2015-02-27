// represents a set of patterns to be displayed
function TrackSet(count){
	this.selectedSet = new Array();
	this.selectedCount = 0;
}

TrackSet.prototype.AddTrack = function(){
	rhomb._song.addTrack();
}

TrackSet.prototype.RemoveTrack = function(index){
	var id = rhomb._song._tracks.getIdBySlot(index);
	rhomb._song._tracks.removeId(id);
}

// adds a pattern to the TrackSet
TrackSet.prototype.AddPattern = function(pattern){
}

// adjusts an input pattern to make it valid (valid patterns are unchanged)
TrackSet.prototype.PreviewPattern = function(pattern){
	return pattern;
}

// selects a pattern from the TrackSet AND sets it as the currently selected pattern
TrackSet.prototype.SelectPattern = function(event){
	var track = rhomb._song._tracks.getObjBySlot(event.trackIndex);

	// get pattern from tick value on the track
	var pattern = track.getPlaylistItemByTicks(event._start);

	this.previousPattern = this.currentPattern;
	this.currentPattern = pattern;
	return pattern;
}

// selects a pattern from the TrackSet WITHOUT setting it as the currently selected pattern
TrackSet.prototype.GetPattern = function(event){
	var track = rhomb._song._tracks.getObjBySlot(event.trackIndex);

	// get pattern from tick value on the track
	var pattern = track.getPlaylistItemByTicks(event._start);

	return pattern;
}

// tries to set a pattern's properties manually (i.e. through a text field in the UI)
TrackSet.prototype.TrySetPattern = function(event, pattern){
	// change to return result of some rhombus function to try to set new _start and _length of a pattern
	return true;
}

// removes and then readds an element to the SortedList to move it to the correct index
TrackSet.prototype.AdjustIndex = function(pattern){
	console.log("[TrackSet.AdjustIndex()] remove me!");
}

// removes a pattern from the TrackSet
TrackSet.prototype.RemovePattern = function(pattern) {
	if (pattern !== undefined)
		rhomb.getSong().getTracks().getObjById(r_index).removeFromPlaylist(pattern.playlistId);
}

// notifies rhombus of a pattern update in the TrackSet
TrackSet.prototype.UpdateRhombPattern = function(pattern) {
	console.log("[TrackSet.UpdateRhombPattern()] remove me!");
}

// represents a single pattern that exists in the pianoroll
function Pattern(event){
	this.trackIndex = event.trackIndex;
	this._start = event._start;
	this._length = event._length;
	this.color = event.color;
	this.outlinecolor = event.outlinecolor;
	this.ID = event.ID;
	this.Xoffset = event.Xoffset;
	this.playlistId = event.playlistId;
}

// used for "close enough" calculations in the UI
function isWithinRange(cursorX, edgeX, displaySettings){
	return (cursorX > edgeX - 5) && (cursorX < edgeX + 5);
}

function mouseOverPattern(mouseX, pattern, displaySettings){
	if(typeof pattern === 'undefined')
		return "none";

	if (isWithinRange(mouseX, ((pattern._start + pattern._length) / displaySettings.TPP))) {
		return "resize";
	}
	else if (isWithinRange(mouseX, (pattern._start / displaySettings.TPP))) {
		return "resize";
	}
	else if ((pattern._start / displaySettings.TPP) < mouseX && mouseX < ((pattern._start + pattern._length) / displaySettings.TPP))
	{
		return "mouseover";
	}
	else
	{
		return "none";
	}
}

function mouseDownPattern(mouseX, TrackSet, displaySettings){
	if(typeof TrackSet.currentPattern === 'undefined')
		return "none";

	if (isWithinRange(mouseX, ((TrackSet.currentPattern._start + TrackSet.currentPattern._length) / displaySettings.TPP))) {
		return "resize-duration";
	}
	else if (isWithinRange(mouseX, (TrackSet.currentPattern._start / displaySettings.TPP))) {
		return "resize-start";
	}
	else if ((TrackSet.currentPattern._start / displaySettings.TPP) < mouseX && mouseX < ((TrackSet.currentPattern._start + TrackSet.currentPattern._length) / displaySettings.TPP))
	{
		return "move";
	}
	else
	{
		return "none";
	}
}
