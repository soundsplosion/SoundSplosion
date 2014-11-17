class UploadController < ApplicationController

	def index
		render :file => 'app/views/upload/uploadfile.html.erb'
	end

  def create
  	uploaded_io = params[:datafile]
    File.open(Rails.root.join('public', 'uploads', uploaded_io.original_filename), 'wb') do |file|
      file.write(uploaded_io.read)
    end
    flash[:notice] = "Your file has been uploaded"
    redirect_to upload_index_path
  end


end
