class LikeController < ApplicationController

  def create
    @track = Track.find(params[:track_id])
    @like = @track.likes.new
    @like.track_id = @track.id
    
    if params[:user_id].nil?
      @like.user_id = current_user.id
    else
      @like.user_id = params[:user_id]
    end

    if @like.save
      render text: @track.title
    else
      flash.now[:danger] = "error"
    end
  end

  private
    def comment_params
      params.require(:comment).permit(:track_id, :authenticity_token, :user_id)
    end
end
