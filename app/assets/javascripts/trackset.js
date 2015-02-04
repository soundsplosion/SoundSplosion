// represents a set of patterns to be displayed
function TrackSet(count){
	this.maxID = 1; // take this out when rhombus provides a way for instances of a pattern in a track to be given an ID
	this.host = undefined;
	this.currentPattern = undefined;
	this.previousPattern = undefined;
	this.selectedSet = new Array();
	this.selectedCount = 0;
	this.tracks = new Array();
	for(var i = 0; i < count; i++){
		this.tracks[i] = new SortedList();
	}
}

// adds a pattern to the TrackSet
TrackSet.prototype.AddPattern = function(pattern){
	// check if the pattern can be added
	pattern = this.PreviewPattern(pattern);
	if(typeof pattern === 'undefined' || !pattern.isValid)
		return undefined;

	// waiting for rhombus to give us a way to assign a (copy of a) pattern to a track and get that instance's ID. Until then, generate our own ID
	// assign a new ID to the pattern
	/*var rpattern = new rhomb.Pattern(pattern.ID);
	pattern.rpattern = rpattern;
	pattern.ID = rpattern._id;*/
	pattern.ID = this.maxID++;

	// insert the pattern into the track
	var track = this.tracks[pattern.trackIndex];
	track.insertOne(pattern);

	// throw rhombus pattern creation
	/*var keyEvent = new CustomEvent("denoto-writepattern", {"detail":{"pattern": rpattern}});
	this.host.dispatchEvent(keyEvent);*/

	// return the added pattern (with any necessary adjustments)
	return pattern;
}

// adjusts an input pattern to make it valid (valid patterns are unchanged)
TrackSet.prototype.PreviewPattern = function(pattern){
	var track = this.tracks[pattern.trackIndex];

	// by default, a pattern is valid until proven otherwise
	pattern.isValid = true;

	if(typeof track === 'undefined'){
		pattern.isValid = false;
		//console.log("Invalid pattern. Reason: destination track does not exist.")
		return pattern;
	}

	if(pattern.tickstart < 0){
		pattern.tickduration += pattern.tickstart;
		pattern.tickstart = 0;
	}

	if(pattern.tickduration <= 0){
		pattern.isValid = false;
		//console.log("Invalid pattern. Reason: negative tick duration.");
	}
	var index = track.bsearch(pattern);

	// check for overlap during backwards draws
	for(var i = index; i < track.length; i++){
		if(typeof track[i] !== 'undefined' && track[i].ID !== pattern.ID && typeof this.selectedSet[track[i].ID] === 'undefined' && pattern.tickstart < track[i].tickstart && pattern.tickstart + pattern.tickduration > track[i].tickstart + track[i].tickduration){
			pattern.isValid = false;
			//console.log("Invalid pattern. Reason: backwards draw overlap.");
		}
	}

	// check to see if this pattern's beginning overlaps with other patterns
	if(index !== -1 && pattern.isValid){
		if(track[index].ID !== pattern.ID && typeof this.selectedSet[track[index].ID] === 'undefined' && track[index].tickstart <= pattern.tickstart && (track[index].tickstart + track[index].tickduration) > pattern.tickstart){
			// if pattern is entirely within existing pattern, nothing to preview
			if((track[index].tickstart + track[index].tickduration) >= (pattern.tickstart + pattern.tickduration)){
				pattern.isValid = false;
				//console.log("Invalid pattern. Reason: entirely within another pattern.");
			}

			// clip the beginning of the pattern to make it valid
			pattern.tickduration = (pattern.tickstart + pattern.tickduration) - (track[index].tickstart + track[index].tickduration);
			pattern.tickstart = track[index].tickstart + track[index].tickduration;
			if(pattern.tickduration <= 0){
				pattern.isValid = false;
				//console.log("Invalid pattern. Reason: SECONDARY negative tick duration.");
			}
		}
		
		// check to see if this pattern's end overlaps with other patterns
		if(index+1 < track.length){
			if(track[index+1].ID !== pattern.ID && typeof this.selectedSet[track[index+1].ID] === 'undefined' && track[index+1].tickstart < (pattern.tickstart + pattern.tickduration) && ((pattern.tickstart + pattern.tickduration) < (track[index+1].tickstart + track[index+1].tickduration) || (pattern.tickstart < track[index+1].tickstart))){
				pattern.tickduration -= (pattern.tickstart + pattern.tickduration) - track[index+1].tickstart;
				if(pattern.tickduration <= 0){
					pattern.isValid = false;
					//console.log("Invalid pattern. Reason: TERTIARY negative tick duration.");
				}
			}
		} else {
			if(track[index].ID !== pattern.ID && typeof this.selectedSet[track[index].ID] === 'undefined' && track[index].tickstart < (pattern.tickstart + pattern.tickduration) && ((pattern.tickstart + pattern.tickduration) < (track[index].tickstart + track[index].tickduration) || (pattern.tickstart < track[index].tickstart))){
				pattern.tickduration -= (pattern.tickstart + pattern.tickduration) - track[index].tickstart;
				if(pattern.tickduration <= 0){
					pattern.isValid = false;
					//console.log("Invalid pattern. Reason: QUATERNARY negative tick duration.");
				}
			}
		}	
	} // handle drawing at the beginning of a track
	else if (pattern.isValid && track.length > 0) {
		if(track[0].ID !== pattern.ID && typeof this.selectedSet[track[0].ID] === 'undefined' && track[0].tickstart < (pattern.tickstart + pattern.tickduration) && ((pattern.tickstart + pattern.tickduration) < (track[0].tickstart + track[0].tickduration) || (pattern.tickstart < track[0].tickstart))){
			pattern.tickduration -= (pattern.tickstart + pattern.tickduration) - track[0].tickstart;
			if(pattern.tickduration <= 0){
				pattern.isValid = false;
				//console.log("Invalid pattern. Reason: QUINTERNARY negative tick duration.");
			}
		}
	}

	// make sure there are no patterns between the new start and end
	if(track.bsearch(pattern.tickstart) != track.bsearch(pattern.tickstart + pattern.tickduration)){
		pattern.isValid = false;
		//console.log("Invalid pattern. Reason: other.");
	}

	// if there are no overlaps, return the original TrackSet
	return pattern;
}

// selects a pattern from the TrackSet AND sets it as the currently selected pattern
TrackSet.prototype.SelectPattern = function(event){
	var track = this.tracks[event.trackIndex];
	if(typeof track === 'undefined')
		return undefined;

	var index = track.bsearch(event);

	if(typeof track[index] === 'undefined')
		return undefined;

	if(track[index].tickstart <= event.tickstart && event.tickstart <= (track[index].tickstart + track[index].tickduration)){
		this.previousPattern = this.currentPattern;
		this.currentPattern = track[index];
		return track[index];
	}

	this.previousPattern = this.currentPattern;
	this.currentPattern = undefined;
	return undefined;
}

// selects a pattern from the TrackSet WITHOUT setting it as the currently selected pattern
TrackSet.prototype.GetPattern = function(event){
	var track = this.tracks[event.trackIndex];
	if(typeof track === 'undefined')
		return undefined;

	var index = track.bsearch(event);

	if(typeof track[index] === 'undefined')
		return undefined;

	if(track[index].tickstart <= event.tickstart && event.tickstart <= (track[index].tickstart + track[index].tickduration)){
		return track[index];
	}

	return undefined;
}

// tries to set a pattern's properties manually (i.e. through a text field in the UI)
TrackSet.prototype.TrySetPattern = function(event, pattern){
	var preview;
	if(typeof pattern === 'undefined')
		preview = new Pattern(this.currentPattern);
	else
		preview = new Pattern(pattern);

	var track = this.tracks[preview.trackIndex];
	var index = track.bsearch(preview);
	preview.tickstart = event.tickstart;
	preview.tickduration = event.tickduration;

	preview = this.PreviewPattern(preview);

	if(!preview.isValid){
		alert("Pattern parameters are not valid");
		return false;
	} else {
		if(event.autoadjust || (preview.tickstart === event.tickstart && preview.tickduration === event.tickduration) || confirm("Pattern parameters need to be adjusted to fit. Would you like to do so?")){
			track[index] = preview; // update the pattern in the SortedList
			
			if(typeof pattern === 'undefined')
				this.currentPattern = preview;
			else
				pattern = preview;

			this.AdjustIndex(this.currentPattern);
			this.UpdateRhombPattern(this.currentPattern);
			return true;
		}
		else
			return false;
	}
}

// removes and then readds an element to the SortedList to move it to the correct index
TrackSet.prototype.AdjustIndex = function(pattern){
	var track = this.tracks[pattern.trackIndex];
	track.InsertionSort();
}

// removes a pattern from the TrackSet
TrackSet.prototype.RemovePattern = function(pattern) {
	// shouldn't try to remove patterns that don't exist
	if (pattern !== undefined) {
		// throw the rhombus pattern deletion
		var keyEvent = new CustomEvent("denoto-erasepattern", {"detail": {"pattern": pattern.rpattern}});
		this.host.dispatchEvent(keyEvent);

		// remove the pattern from each place it was found
		var track = this.tracks[pattern.trackIndex];
		var index = track.bsearch(pattern);
		this.selectedSet[pattern.ID] = undefined;

		if(index !== -1){
			track.remove(index);
			this.currentPattern = undefined;
			this.previousPattern = undefined;
			this.selectedCount--;
		}
	}
}

// notifies rhombus of a pattern update in the TrackSet
TrackSet.prototype.UpdateRhombPattern = function(pattern) {
	// shouldn't try to update patterns that don't exist
	if (pattern !== undefined) {
		// need to wait until rhombus can handle instances of patterns in tracks
		/*// update the rhombus version of the pattern
		pattern.rpattern._start = pattern.tickstart;
		pattern.rpattern._length = pattern.tickduration;

		// throw the rhombus pattern update
		var keyEvent = new CustomEvent("denoto-updatepattern", {"detail": {"pattern": pattern.rpattern}});
		this.host.dispatchEvent(keyEvent);*/
	}
}

// represents a single pattern that exists in the pianoroll
function Pattern(event){
	this.trackIndex = event.trackIndex;
	this.tickstart = event.tickstart;
	this.tickduration = event.tickduration;
	this.color = event.color;
	this.outlinecolor = event.outlinecolor;
	this.ID = event.ID;
	this.rpattern = event.rpattern;
	this.isValid = event.isValid;
	this.Xoffset = event.Xoffset;
}

// used for "close enough" calculations in the UI
function isWithinRange(cursorX, edgeX, displaySettings){
	return (cursorX > edgeX - 5) && (cursorX < edgeX + 5);
}

function mouseOverPattern(mouseX, pattern, displaySettings){
	if(typeof pattern === 'undefined')
		return "none";

	if (isWithinRange(mouseX, ((pattern.tickstart + pattern.tickduration) / displaySettings.TPP))) {
		return "resize";
	}
	else if (isWithinRange(mouseX, (pattern.tickstart / displaySettings.TPP))) {
		return "resize";
	}
	else if ((pattern.tickstart / displaySettings.TPP) < mouseX && mouseX < ((pattern.tickstart + pattern.tickduration) / displaySettings.TPP))
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

	if (isWithinRange(mouseX, ((TrackSet.currentPattern.tickstart + TrackSet.currentPattern.tickduration) / displaySettings.TPP))) {
		return "resize-duration";
	}
	else if (isWithinRange(mouseX, (TrackSet.currentPattern.tickstart / displaySettings.TPP))) {
		return "resize-start";
	}
	else if ((TrackSet.currentPattern.tickstart / displaySettings.TPP) < mouseX && mouseX < ((TrackSet.currentPattern.tickstart + TrackSet.currentPattern.tickduration) / displaySettings.TPP))
	{
		return "move";
	}
	else
	{
		return "none";
	}
}