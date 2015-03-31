// represents a set of notes to be displayed
function NoteSet(count, id) {
  this.host = undefined;
  this.id = id;
  this.currentNote = undefined;
  this.previousNote = undefined;
  this.selectedSet = new Array();
  this.selectedCount = 0;
  this.lanes = new Array();
  for(var i = 0; i < count; i++) {
    this.lanes[i] = new SortedList();
  }
}

// inserts an existing rhombus note to the noteset
NoteSet.prototype.InsertNote = function(rnote, color) {
  var note = {"keyValue": -1 * (rnote._pitch + 1 - this.lanes.length), 
              "tickstart": rnote._start, 
              "tickduration": rnote._length, 
              "velocity": rnote._velocity, 
              "rnote": rnote,
              "color": color};

  // insert the note into the lane
  var lane = this.lanes[note.keyValue];
  lane.insertOne(note);

  // return the added note (with any necessary adjustments)
  return note;
}

// adds a note to the noteset
NoteSet.prototype.AddNote = function(note) {
  // check if the note can be added
  note = this.PreviewNote(note);
  if (typeof note === 'undefined' || !note.isValid) {
    return undefined;
  }

  if (typeof note.ID === 'undefined') {
    // assign a new ID to the note
    var rnote = new rhomb.Note(this.lanes.length - 1 - note.keyValue, note.tickstart, note.tickduration, +note.velocity);
    note.rnote = rnote;
    note.ID = rnote._id;
  }

  // insert the note into the lane
  var lane = this.lanes[note.keyValue];
  lane.insertOne(note);

  console.log("[NoteSet] Writing note ID " + note.rnote._id + " at tick " + note.rnote.getStart() + ", length " + note.rnote.getLength() + ", pitch " + note.rnote._pitch);
  rhomb.Edit.insertNote(note.rnote, this.id);

  // return the added note (with any necessary adjustments)
  return note;
}

// adjusts an input note to make it valid (valid notes are unchanged)
NoteSet.prototype.PreviewNote = function(note) {
  var lane = this.lanes[note.keyValue];

  // by default, a note is valid until proven otherwise
  note.isValid = true;

  if (note.tickstart < 0) {
    note.tickduration += note.tickstart;
    note.tickstart = 0;
  }

  if (note.tickduration <= 0) {
    note.isValid = false;
    //console.log("Invalid note. Reason: negative tick duration.");
  }
  var index = lane.bsearch(note);

  // check for overlap during backwards draws
  for(var i = index; i < lane.length; i++) {
    if (typeof lane[i] !== 'undefined' && lane[i].ID !== note.ID && typeof this.selectedSet[lane[i].ID] === 'undefined' && note.tickstart < lane[i].tickstart && note.tickstart + note.tickduration > lane[i].tickstart + lane[i].tickduration) {
      note.isValid = false;
      //console.log("Invalid note. Reason: backwards draw overlap.");
    }
  }

  // check to see if this note's beginning overlaps with other notes
  if (index !== -1 && note.isValid) {
    if (lane[index].ID !== note.ID && typeof this.selectedSet[lane[index].ID] === 'undefined' && lane[index].tickstart <= note.tickstart && (lane[index].tickstart + lane[index].tickduration) > note.tickstart) {
      // if note is entirely within existing note, nothing to preview
      if ((lane[index].tickstart + lane[index].tickduration) >= (note.tickstart + note.tickduration)) {
        note.isValid = false;
        //console.log("Invalid note. Reason: entirely within another note.");
      }

      // clip the beginning of the note to make it valid
      note.tickduration = (note.tickstart + note.tickduration) - (lane[index].tickstart + lane[index].tickduration);
      note.tickstart = lane[index].tickstart + lane[index].tickduration;
      if (note.tickduration <= 0) {
        note.isValid = false;
        //console.log("Invalid note. Reason: SECONDARY negative tick duration.");
      }
    }
    
    // check to see if this note's end overlaps with other notes
    if (index+1 < lane.length) {
      if (lane[index+1].ID !== note.ID && typeof this.selectedSet[lane[index+1].ID] === 'undefined' && lane[index+1].tickstart < (note.tickstart + note.tickduration) && ((note.tickstart + note.tickduration) < (lane[index+1].tickstart + lane[index+1].tickduration) || (note.tickstart < lane[index+1].tickstart))) {
        note.tickduration -= (note.tickstart + note.tickduration) - lane[index+1].tickstart;
        if (note.tickduration <= 0) {
          note.isValid = false;
          //console.log("Invalid note. Reason: TERTIARY negative tick duration.");
        }
      }
    } else {
      if (lane[index].ID !== note.ID && typeof this.selectedSet[lane[index].ID] === 'undefined' && lane[index].tickstart < (note.tickstart + note.tickduration) && ((note.tickstart + note.tickduration) < (lane[index].tickstart + lane[index].tickduration) || (note.tickstart < lane[index].tickstart))) {
        note.tickduration -= (note.tickstart + note.tickduration) - lane[index].tickstart;
        if (note.tickduration <= 0) {
          note.isValid = false;
          //console.log("Invalid note. Reason: QUATERNARY negative tick duration.");
        }
      }
    } 
  } // handle drawing at the beginning of a lane
  else if (note.isValid && lane.length > 0) {
    if (lane[0].ID !== note.ID && typeof this.selectedSet[lane[0].ID] === 'undefined' && lane[0].tickstart < (note.tickstart + note.tickduration) && ((note.tickstart + note.tickduration) < (lane[0].tickstart + lane[0].tickduration) || (note.tickstart < lane[0].tickstart))) {
      note.tickduration -= (note.tickstart + note.tickduration) - lane[0].tickstart;
      if (note.tickduration <= 0) {
        note.isValid = false;
        //console.log("Invalid note. Reason: QUINTERNARY negative tick duration.");
      }
    }
  }

  // make sure there are no notes between the new start and end
  if (lane.bsearch(note.tickstart) != lane.bsearch(note.tickstart + note.tickduration)) {
    note.isValid = false;
    //console.log("Invalid note. Reason: other.");
  }

  // if there are no overlaps, return the original noteset
  return note;
}

// selects a note from the noteset AND sets it as the currently selected note
NoteSet.prototype.SelectNote = function(event) {
  var lane = this.lanes[event.keyValue];
  if (typeof lane === 'undefined') {
    return undefined;
  }

  var index = lane.bsearch(event);

  if (typeof lane[index] === 'undefined') {
    return undefined;
  }

  if (lane[index].tickstart <= event.tickstart && event.tickstart <= (lane[index].tickstart + lane[index].tickduration)) {
    this.previousNote = this.currentNote;
    this.currentNote = lane[index];
    return lane[index];
  }

  this.previousNote = this.currentNote;
  this.currentNote = undefined;
  return undefined;
}

// selects a note from the noteset WITHOUT setting it as the currently selected note
NoteSet.prototype.GetNote = function(event) {
  var lane = this.lanes[event.keyValue];
  if (typeof lane === 'undefined') {
    return undefined;
  }

  var index = lane.bsearch(event);

  if (typeof lane[index] === 'undefined') {
    return undefined;
  }

  if (lane[index].tickstart <= event.tickstart && event.tickstart <= (lane[index].tickstart + lane[index].tickduration)) {
    return lane[index];
  }

  return undefined;
}

// tries to set a note's properties manually (i.e. through a text field in the UI)
NoteSet.prototype.TrySetNote = function(event, note) {
  var preview;
  if (typeof note === 'undefined') {
    preview = new Note(this.currentNote);
  }
  else {
    preview = new Note(note);
  }

  var lane = this.lanes[preview.keyValue];
  var index = lane.bsearch(preview);
  preview.tickstart = event.tickstart;
  preview.tickduration = event.tickduration;
  preview.velocity = event.velocity;

  preview = this.PreviewNote(preview);

  if (!preview.isValid) {
    alert("Note parameters are not valid");
    return false;
  } else {
    if (event.autoadjust || (preview.tickstart === event.tickstart && preview.tickduration === event.tickduration) || confirm("Note parameters need to be adjusted to fit. Would you like to do so?")) {
      lane[index] = preview; // update the note in the SortedList
      
      if (typeof note === 'undefined')
        this.currentNote = preview;
      else
        note = preview;

      this.AdjustIndex(this.currentNote);
      this.UpdateRhombNote(this.currentNote);
      return true;
    }
    else
      return false;
  }
}

// removes and then readds an element to the SortedList to move it to the correct index
NoteSet.prototype.AdjustIndex = function(note) {
  var lane = this.lanes[note.keyValue];
  lane.InsertionSort();
}

// removes a note from the noteset
NoteSet.prototype.RemoveNote = function(note) {
  // shouldn't try to remove notes that don't exist
  if (note !== undefined) {
    console.log("[NoteSet] Erasing note ID " + note.rnote._id + " at tick " + note.rnote.getStart());

    rhomb.Edit.deleteNote(note.rnote._id, this.id);

    // remove the note from each place it was found
    var lane = this.lanes[note.keyValue];
    var index = lane.bsearch(note);
    this.selectedSet[note.ID] = undefined;

    if (index !== -1) {
      lane.remove(index);
      this.currentNote = undefined;
      this.previousNote = undefined;
      this.selectedCount--;
    }
  }
}

// notifies rhombus of a note update in the noteset
NoteSet.prototype.UpdateRhombNote = function(note) {
  // shouldn't try to update notes that don't exist
  if (note !== undefined) {
    var rnote = note.rnote;

    // don't allow notes shorter than 1/128th notes
    if (note.tickduration < 15) {
      note.tickduration = 15;
      return;
    }

    // don't change the note if nothing has changed
    if (note.tickstart === rnote.getStart() && 
        note.tickduration === rnote.getLength() && note.velocity === rnote.getVelocity()) {
      return;
    }

    // TODO: fix keyValue weirdness
    var res = rhomb.Edit.updateNote(rnote._id, rnote.getPitch(), note.tickstart, note.tickduration, note.velocity, this.id);

    // roll back the changes if they're not accepted by Rhombus
    if (typeof res === "undefined") {
      //note.keyValue = rnote.getPitch();
      note.tickstart = rnote.getStart();
      note.tickduration = rnote.getLength();
      note.velocity = rnote.getVelocity();
    }

    console.log("[NoteSet] Updating note ID " + rnote._id + 
                " at tick "   + rnote.getStart()  + 
                ", length "   + rnote.getLength() + 
                ", pitch "    + rnote.getPitch()  + 
                ", velocity " + rnote.getVelocity());
  }
}

// represents a single note that exists in the pianoroll
function Note(event) {
  this.keyValue = event.keyValue;
  this.tickstart = event.tickstart;
  this.tickduration = event.tickduration;
  this.velocity = event.velocity;
  this.color = event.color;
  this.outlinecolor = event.outlinecolor;
  this.ID = event.ID;
  this.rnote = event.rnote;
  this.isValid = event.isValid;
  this.Xoffset = event.Xoffset;
}

// used for "close enough" calculations in the UI
function isWithinRange(cursorX, edgeX, displaySettings) {
  return (cursorX > edgeX - 5) && (cursorX < edgeX + 5);
}

function mouseOverNote(mouseX, note, displaySettings) {
  if (typeof note === 'undefined') {
    return "none";
  }

  if (isWithinRange(mouseX, ((note.tickstart + note.tickduration) / displaySettings.TPP))) {
    return "resize";
  }
  else if (isWithinRange(mouseX, (note.tickstart / displaySettings.TPP))) {
    return "resize";
  }
  else if ((note.tickstart / displaySettings.TPP) < mouseX && mouseX < ((note.tickstart + note.tickduration) / displaySettings.TPP))
  {
    return "mouseover";
  }
  else
  {
    return "none";
  }
}

function mouseDownNote(mouseX, noteset, displaySettings) {
  if (typeof noteset.currentNote === 'undefined') {
    return "none";
  }

  if (isWithinRange(mouseX, ((noteset.currentNote.tickstart + noteset.currentNote.tickduration) / displaySettings.TPP))) {
    return "resize-duration";
  }
  else if (isWithinRange(mouseX, (noteset.currentNote.tickstart / displaySettings.TPP))) {
    return "resize-start";
  }
  else if ((noteset.currentNote.tickstart / displaySettings.TPP) < mouseX && mouseX < ((noteset.currentNote.tickstart + noteset.currentNote.tickduration) / displaySettings.TPP))
  {
    return "move";
  }
  else
  {
    return "none";
  }
}