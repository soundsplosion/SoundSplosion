module CommonMethods

  def competition_rank(my_track)
    @my_rating = get_rating(my_track.ratings)
    @my_rank = 1

    @tracks = Competition.find(my_track.competition_id).tracks
    @tracks.map do |track|
      rating = get_rating(track.ratings)
      if rating > @my_rating
        @my_rank += 1
      elsif rating == @my_rating
	if (track.likes.count + track.favorites.count)  > (my_track.likes.count + my_track.favorites.count)
         @my_rank += 1
        elsif (track.likes.count + track.favorites.count)  == (my_track.likes.count + my_track.favorites.count)
          if track.id < my_track.id
	    @my_rank += 1
          end 
        end
      end
    end

    return @my_rank
  end

  def get_rating(ratings)
    if ratings.size == 0
      return 0
    end
    get_average_rating(ratings) * ratings.size
  end

  def get_average_rating(ratings)
    if ratings.size == 0
      return 0
    end
    ratings.sum(:score) / ratings.size
  end

  def is_competition_current(competition)
    startdate = competition.startdate.to_datetime
    enddate = competition.enddate.to_datetime
    current = DateTime.current
    startdate <= current && enddate > current 
  end

  def check_constraints
    @competition = Competition.find(params[:competition_id])
    parsed = JSON.parse(params[:track_data])

    # Check number of tracks constraint
    numTracks = parsed["_tracks"]["_slots"].length 
    if (!@competition.max_tracks.nil? && numTracks > @competition.max_tracks)
      render text: "INVALID:You exceeded maximum number of tracks parameter!" and return
    end

    if (!@competition.min_tracks.nil? && numTracks < @competition.min_tracks)
      render text: "INVALID:You don't have minimum number of tracks required!" and return
    end

    # Check number of instruments constraint
    numInstruments = parsed["_instruments"]["_slots"].length 
    if (!@competition.max_instruments.nil? && numInstruments > @competition.max_instruments)
      render text: "INVALID:You exceeded maximum number of instruments parameter!" and return
    end

    if (!@competition.min_instruments.nil? && numInstruments <  @competition.min_instruments)
      render text: "INVALID:You haven't used minimum number of instruments!" and return
    end

    # Check number of patterns constraint
    numPatterns = parsed["_patterns"].length
    if (!@competition.min_patterns.nil? && numPatterns < @competition.min_patterns)
      render text: "INVALID:You haven't used minimum number of patterns!" and return
    end
    
    if (!@competition.max_patterns.nil? && numPatterns > @competition.max_patterns)
      render text: "INVALID:You exceeded maximum number of patterns!" and return
    end

    # Check number of notes constraint
    numNotes = Integer(parsed["_noteCount"])
    if (!@competition.min_notes.nil? && numNotes < @competition.min_notes)
      render text: "INVALID:You haven't used minimum number of notes!" and return
    end
    
    if (!@competition.max_notes.nil? && numNotes > @competition.max_notes)
      render text: "INVALID:You exceeded maximum number of notes!" and return
    end

    # Check number of effects constraint
    numEffects = parsed["_effects"].length 
    if (!@competition.min_effects.nil? && numEffects < @competition.min_effects)
      render text: "INVALID:You haven't used minimum number of effects!" and return
    end

    if (!@competition.max_effects.nil? && numEffects > @competition.max_effects)
      render text: "INVALID:You exceeded maximum number of effects!" and return
    end
    render text: "VALID"
  end
end
