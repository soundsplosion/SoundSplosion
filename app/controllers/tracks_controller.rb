class TracksController < ApplicationController
  before_action :set_track, only: [:show, :edit, :update]
  skip_before_filter :verify_authenticity_token
  helper_method :get_track
  require 'fileutils'
  include CommonMethods

  # GET /tracks
  # GET /tracks.json
  def index
    @tracks = Track.all.paginate(:per_page => 5, :page => params[:page])
  end

  # GET /tracks/1
  # GET /tracks/1.json
  def show
  end

  # GET /tracks/new
  def new
    @track = Track.new
  end

  # GET /tracks/1/edit
  def edit
  end

  # POST /tracks
  # POST /tracks.json
  def create
    @track = Track.new(track_params)
    if @track.title.blank?
      @track.title = "No title"
    end

    @track.username = current_user.username
    @track.user_id = current_user.id

    unless params[:competition_id].nil?
      @track.competition_id = params[:competition_id]
    end

    respond_to do |format|
      if @track.save
        @track.create_activity :create, owner: current_user
        File.open(Rails.root.join('public', 'uploads', @track.id.to_s), 'wb') do |file|
          file.write(params[:track_data])
        end
        format.html { redirect_to '/tracks/' + @track.id.to_s + '/edit' }
      else
        render text: "Unable to save track" and return
      end
    end
  end

  # PATCH/PUT /tracks/1
  # PATCH/PUT /tracks/1.json
  def update
    respond_to do |format|
      if @track.update(track_params)
        format.html { redirect_to @track, notice: 'Track was successfully updated.' }
        format.json { render :show, status: :ok, location: @track }
      else
        format.html { render :edit }
        format.json { render json: @track.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /tracks/1
  # DELETE /tracks/1.json
  def destroy
    @track = Track.find(params[:id])
    @title = @track.title.to_s
    FileUtils.rm_rf(Rails.root.join('public', 'uploads', @track.id.to_s))
    @track.destroy
    render text: @title
  end

  def get_track
    file = File.open(Rails.root.join('public', 'uploads', @track.id.to_s), 'rb')
    file.read
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_track
      @track = Track.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def track_params
      params.require(:track).permit(:title, :competition_id, :track_data)
    end
end
