class UploadController < ApplicationController
	def index
	end
	
	def new
		title = params[:track_title]
	  	data = params[:track_data]
	    File.open(Rails.root.join('public', 'uploads', title), 'wb') do |file|
	      file.write(data)
	    end
	    flash[:notice] = "Your file has been uploaded"
	    redirect_to upload_index_path
  end
end
