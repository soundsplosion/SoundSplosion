class CommentController < ApplicationController
  def create
    @track = Track.find(params[:track_id])
    @comment = @track.comments.new
    @comment.body = params[:body]
    @comment.track_id = @track.id
    @comment.strftime = DateTime.now.strftime('%m/%d/%Y')

    if params[:user_id].nil?
      @comment.user_id = current_user.id
    else
      @comment.user_id = params[:user_id]
    end

    @comment.user_name = User.find(@comment.user_id).username

    if @comment.save
      @comment.create_activity :create, owner: current_user
      render json: @comment
    else
      flash.now[:danger] = "error"
    end
  end

  private
    def comment_params
      params.require(:comment).permit(:body, :track_id, :user_id, :authenticity_token)
    end
end
