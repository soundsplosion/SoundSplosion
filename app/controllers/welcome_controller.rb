class WelcomeController < ApplicationController
  helper_method :get_global_top_five_tracks

  def get_global_top_five_tracks
    Track.limit(5).
          joins("LEFT OUTER JOIN likes ON likes.track_id = tracks.id").
          joins("LEFT OUTER JOIN favorites ON favorites.track_id = tracks.id").
          group("likes.track_id, favorites.track_id").
          order("(count(likes.track_id) + count(favorites.track_id)) desc")
  end
end
