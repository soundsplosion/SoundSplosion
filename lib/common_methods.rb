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
    # DateTime.current is 15 minutes 30 seconds late for some reason
    current = DateTime.current + Rational(930, 86400)
    startdate <= current && enddate > current 
  end
end
