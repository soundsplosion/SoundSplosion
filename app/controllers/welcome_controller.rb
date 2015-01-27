class WelcomeController < ApplicationController
  helper_method :get_global_top_five_tracks
  helper_method :get_user_activity

  def get_user_activity(count)
    PublicActivity::Activity.limit(count).order('created_at desc')
  end

  def get_global_top_five_tracks
    Track.limit(5).
          joins("LEFT OUTER JOIN likes ON likes.track_id = tracks.id").
          joins("LEFT OUTER JOIN favorites ON favorites.track_id = tracks.id").
          group("likes.track_id, favorites.track_id").
          order("(count(likes.track_id) + count(favorites.track_id)) desc")
  end
end
