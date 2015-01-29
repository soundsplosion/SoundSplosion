class WelcomeController < ApplicationController
  helper_method :get_global_top_five_tracks
  helper_method :get_user_activities
  helper_method :get_current_competitions
  helper_method :get_previous_competitions

  def get_user_activities(count)
    PublicActivity::Activity.limit(count).order('created_at desc')
  end

  def get_global_top_five_tracks
    Track.limit(5).
          joins("LEFT OUTER JOIN likes ON likes.track_id = tracks.id").
          joins("LEFT OUTER JOIN favorites ON favorites.track_id = tracks.id").
          group("likes.track_id, favorites.track_id").
          order("(count(likes.track_id) + count(favorites.track_id)) desc")
  end

  def get_current_competitions(count)
    Competition.where('startDate <= CURRENT_TIMESTAMP').
                where('endDate >= CURRENT_TIMESTAMP').
                order('created_at desc').
                limit(count)
  end

  def get_previous_competitions(count)
    Competition.where('startDate < CURRENT_TIMESTAMP').
                where('endDate < CURRENT_TIMESTAMP').
                order('created_at desc').
                limit(count)
  end
end
