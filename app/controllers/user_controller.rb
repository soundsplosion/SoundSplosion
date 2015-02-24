class UserController < ApplicationController
  include CommonMethods
  helper_method :average_rating
  helper_method :competition_rank

  def show
    @user = User.find(params[:id])
    @user.image = ActionController::Base.helpers.asset_path('default_user.png', :digest => false)

    @liked_tracks = Track.where(id: get_liked_tracks_ids(@user)).paginate(:per_page => 3, :page => params[:like]).order('id DESC')
    @favorited_tracks = Track.where(id: get_favorited_tracks_ids(@user)).paginate(:per_page => 3, :page => params[:favorite]).order('id DESC')
    @my_tracks = @user.tracks.paginate(:per_page => 3, :page => params[:my]).order('id DESC')
    @my_entries = @my_tracks.where('competition_id IS NOT NULL').paginate(:per_page => 3, :page => params[:entry])

    respond_to do |format|
        format.html # show.html.erb
        format.xml { render :xml => @user }
    end
  end

  private
    def get_liked_tracks_ids(user)
        liked_tracks_ids = Array.new

        user.likes.map do |like|
            liked_tracks_ids.push(like.track_id)
        end

        return liked_tracks_ids
    end

    def get_favorited_tracks_ids(user)
        favorited_tracks_ids = Array.new

        @user.favorites.map do |favorite|
            favorited_tracks_ids.push(favorite.track_id)
        end

        return favorited_tracks_ids
    end
end
