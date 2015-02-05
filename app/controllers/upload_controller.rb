class UploadController < ApplicationController
	def new
	  track_id = params[:track_id]
  	data = params[:track_data]
    File.open(Rails.root.join('public', 'uploads', track_id), 'wb') do |file|
      file.write(data)
    end
    flash[:notice] = "Your track has been saved"
    redirect_to upload_index_path
  end
end
