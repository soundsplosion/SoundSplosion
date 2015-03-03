class TrackPlayController < ApplicationController
  def create
    @track = Track.find(params[:track_id])
    @track_play = @track.track_plays.new
    @track_play.track_id = @track.id

    if params[:user_id].nil?
      @track_play.user_id = current_user.id
    else
      @track_play.user_id = params[:user_id]
    end
    @track_play.save
    render text: @track.title
  end

  private
    def comment_params
      params.require(:comment).permit(:track_id, :authenticity_token, :user_id)
    end
end