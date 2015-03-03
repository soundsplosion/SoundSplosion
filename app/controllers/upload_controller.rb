class UploadController < ApplicationController
	def new
	  track_id = params[:track_id]
    if !Track.find(track_id).competition_id.nil?
      render :status => 400
    end
  	data = params[:track_data]
    File.open(Rails.root.join('public', 'uploads', track_id), 'wb') do |file|
      file.write(data)
    end
    flash[:notice] = "Your track has been saved"
    redirect_to upload_index_path
  end
end
