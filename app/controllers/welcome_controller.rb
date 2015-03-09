class WelcomeController < ApplicationController
  def index
    @global_top_five_tracks = get_global_top_five_tracks
    @user_activities = get_user_activities(5)
    @current_competitions = get_current_competitions(3)
    @previous_competition = get_previous_competitions(3)
    @upcoming_competition = get_upcoming_competitions(3)

  end

  def get_user_activities(count)
    PublicActivity::Activity.limit(count).order('created_at desc')
  end

  def get_global_top_five_tracks
    Track.limit(5).
          group("tracks.id").
          joins("LEFT OUTER JOIN likes ON likes.track_id = tracks.id").
          joins("LEFT OUTER JOIN favorites ON favorites.track_id = tracks.id").
          group("likes.track_id, favorites.track_id").
          order("(count(likes.track_id) + count(favorites.track_id)) desc")
  end

  def get_current_competitions(count)
    # current timestamp is 15 minutes 30 second off from real time for unknown reason
    Competition.where("startdate <= CURRENT_TIMESTAMP").
                where("enddate >= CURRENT_TIMESTAMP").
                order('created_at desc').
                limit(count)
  end

  def get_previous_competitions(count)
    Competition.where("startdate < CURRENT_TIMESTAMP").
                where("enddate < CURRENT_TIMESTAMP").
                order('created_at desc').
                limit(count)
  end

  def get_upcoming_competitions(count)
    Competition.where("startdate > CURRENT_TIMESTAMP").
                where("enddate > CURRENT_TIMESTAMP").
                order('created_at desc').
                limit(count)
  end
end
