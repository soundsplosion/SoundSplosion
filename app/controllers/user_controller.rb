class UserController < ApplicationController
  include CommonMethods
  helper_method :get_average_rating
  helper_method :competition_rank

  def show
    @user = User.find(params[:id])
    @user.image = ActionController::Base.helpers.asset_path('default_user.png', :digest => false)

    @liked_tracks = Track.where(id: @user.likes.pluck(:track_id)).order('id DESC')
    @favorited_tracks = Track.where(id: @user.favorites.pluck(:track_id)).order('id DESC')
    @my_tracks = @user.tracks.order('id DESC')
    @my_entries = @my_tracks.where('competition_id IS NOT NULL').paginate(:per_page => 5, :page => params[:entry])

    respond_to do |format|
        format.html # show.html.erb
        format.xml { render :xml => @user }
    end
  end
end
