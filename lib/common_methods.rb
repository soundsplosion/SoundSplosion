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

  def check_constraints_ajax
    result = check_constraints(params[:track_data], params[:competition_id])
    render :text => result
  end

  def check_constraints(data, competition_id)
    @competition = Competition.find(competition_id)
    parsed = JSON.parse(data)

    numTracks = parsed["_tracks"]["_slots"].length 
    numInstruments = parsed["_instruments"]["_slots"].length 
    numPatterns = parsed["_patterns"].length
    numNotes = Integer(parsed["_noteCount"])
    numEffects = parsed["_effects"].length 


    if !@competition.max_tracks.nil? && numTracks > @competition.max_tracks
      return "INVALID:You exceeded maximum number of tracks parameter!"
    end

    if !@competition.min_tracks.nil? && numTracks < @competition.min_tracks
      return "INVALID:You don't have minimum number of tracks required!"
    end

    if !@competition.max_instruments.nil? && numInstruments > @competition.max_instruments
      return "INVALID:You exceeded maximum number of instruments parameter!"
    end

    if !@competition.min_instruments.nil? && numInstruments <  @competition.min_instruments
      return "INVALID:You haven't used minimum number of instruments!"
    end

    if !@competition.min_patterns.nil? && numPatterns < @competition.min_patterns
      return "INVALID:You haven't used minimum number of patterns!"
    end
    
    if !@competition.max_patterns.nil? && numPatterns > @competition.max_patterns
      return "INVALID:You exceeded maximum number of patterns!"
    end

    if !@competition.min_notes.nil? && numNotes < @competition.min_notes
      return "INVALID:You haven't used minimum number of notes!"
    end
    
    if !@competition.max_notes.nil? && numNotes > @competition.max_notes
      return "INVALID:You exceeded maximum number of notes!"
    end

    if !@competition.min_effects.nil? && numEffects < @competition.min_effects
      return "INVALID:You haven't used minimum number of effects!"
    end

    if !@competition.max_effects.nil? && numEffects > @competition.max_effects
      return "INVALID:You exceeded maximum number of effects!"
    end

    return "VALID"
  end
end
