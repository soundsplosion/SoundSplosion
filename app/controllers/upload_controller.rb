class UploadController < ApplicationController
   def new
    track_id = params[:track_id]
    track = Track.find(track_id)
    if !can_edit(track)
      render :status => 400
    end
    data = params[:track_data]
    JSON.parse(params[:track_data])
    File.open(Rails.root.join('public', 'uploads', track_id), 'wb') do |file|
      file.write(data)
    end
    redirect_to upload_index_path
  end

  def can_edit(track)
    current_user && current_user.id == track.user_id
  end
end
