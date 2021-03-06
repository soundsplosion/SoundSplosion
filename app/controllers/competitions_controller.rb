class CompetitionsController < ApplicationController
  before_action :set_competition, only: [:show, :edit, :update, :destroy]
  include CommonMethods
  helper_method :competition_rank
  helper_method :get_rating
  helper_method :is_competition_current
  helper_method :get_tracks_ordered_by_rank
  helper_method :get_average_rating
  # GET /competitions
  # GET /competitions.json
  def index
    @competitions = Competition.all
  end

  # GET /competitions/1
  # GET /competitions/1.json
  def show
    @tracks = Track.where("competition_id = ?", params[:id]).all

    unless current_user.nil?
      # A track can participate in one competition at a time
      @my_tracks_to_submit = Track.where("username = ?", current_user.username).where("competition_id IS NULL").all
    end
  end

  # GET /competitions/new
  def new
    @competition = Competition.new
  end

  # GET /competitions/1/edit
  def edit
  end

  # POST /competitions
  # POST /competitions.json
  def create
    if !current_user
      respond_to do |format|
        format.html { redirect_to '/competitions/new' }
      end
      return
    end

    @competition = Competition.new(competition_params)
    @competition.creator_id = current_user.id
    respond_to do |format|
      if @competition.save
        @competition.create_activity :create, owner: current_user
        format.html { redirect_to @competition, notice: 'Competition was successfully created.' }
        format.json { render :show, status: :created, location: @competition }
      else
        format.html { render :new }
        format.json { render json: @competition.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /competitions/1
  # PATCH/PUT /competitions/1.json
  def update
    respond_to do |format|
      if @competition.update(competition_params)
        format.html { redirect_to @competition, notice: 'Competition was successfully updated.' }
        format.json { render :show, status: :ok, location: @competition }
      else
        format.html { render :edit }
        format.json { render json: @competition.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /competitions/1
  # DELETE /competitions/1.json
  def destroy
    @competition.destroy
    respond_to do |format|
      format.html { redirect_to competitions_url, notice: 'Competition was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  # GET /competitions/new_entry
  def new_entry
    @competition = Competition.find(params[:id])
  end

  def get_tracks_ordered_by_rank(tracks)
    ordered = {}

    tracks.map do |track|
      rank = competition_rank(track)
      ordered[track] = rank
    end

    return ordered.sort_by {|_key, value| value}
  end

  def enter_competition
    @track = Track.where("id = ?", params[:track_id]).first
    file = File.open(Rails.root.join('public', 'uploads', @track.id.to_s), 'rb')
    result = check_constraints(file.read, params[:competition_id])
    
    if result == "VALID"
      @track.update_attribute(:competition_id, params[:competition_id])
      render :text => result
    else
      exit
    end
  end


  private
    # Use callbacks to share common setup or constraints between actions.
    def set_competition
      if params[:competition_id].nil?
        @competition = Competition.find(params[:id])
      else
        @competition = Competition.find(params[:competition_id])
      end
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def competition_params
      params.require(:competition).permit(:title, :startdate, :enddate, :constraints, \
                                          :competition_id, :track_id, :min_tracks, :max_tracks, \
                                          :min_instruments, :max_instruments, :max_notes, :min_notes, \
                                          :max_effects, :min_effects, :max_patterns, :min_patterns)
    end
end
