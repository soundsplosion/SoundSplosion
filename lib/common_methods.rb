module CommonMethods

  def competition_rank(my_track)
    @my_rating = get_rating(my_track.ratings)
    @my_rank = 1

    @tracks = Competition.find(my_track.competition_id).tracks
    @tracks.map do |track|
      if average_rating(track.ratings) > @my_average_rating
        @my_rank += 1
      end
    end

    return @my_rank
  end

  def get_rating(ratings)
    if ratings.size == 0
      return 0
    end

    ratings.sum(:score) / ratings.size
  end
end
