class FavoriteController < ApplicationController
  def create
    @track = Track.find(params[:track_id])
    @favorite = @track.favorites.new
    @favorite.track_id = @track.id

    if params[:user_id].nil?
      @favorite.user_id = current_user.id
    else
      @favorite.user_id = params[:user_id]
    end

    if @favorite.save
      @favorite.create_activity :create, owner: current_user
      render text: @track.title
    else
      flash.now[:danger] = "error"
    end
  end

  def destroy
    @track = Track.find(params[:track_id])
    @favorite = @track.favorites.where(user_id: currrent_user.id)
    @favorite.destroy_all
    render text: "Unfavorited"
  end 
  private
    def comment_params
      params.require(:comment).permit(:track_id, :authenticity_token, :user_id)
    end
end
