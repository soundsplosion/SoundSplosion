class RatingsController < ApplicationController
  def create
    @track = Track.find(params[:track_id])
    @rating = Rating.find_by(user_id: current_user.id, track_id: @track.id)
    
    if @rating.present?
      @rating.update_attribute('score', params[:score])
      render text: "success"
    else
      @rating = @track.ratings.new
      @rating.track_id = @track.id
      @rating.score = params[:score]
      @rating.user_id = current_user.id

      if @rating.save
        render text: "success"
      else
        render text: "error"
      end
    end
  end

  private
    def rating_params
      params.require(:rating).permit(:track_id, :authenticity_token, :score)
    end
end