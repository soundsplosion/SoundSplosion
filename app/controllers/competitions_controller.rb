class CompetitionsController < ApplicationController
  before_action :set_competition, only: [:show, :edit, :update, :destroy]
  helper_method :average_rating
  helper_method :competition_rank

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

    @tracks_ordered_by_rank = get_tracks_ordered_by_rank(@tracks)
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
    @competition = Competition.new(competition_params)

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

  def competition_rank(tracks, my_track)
    @my_average_rating = average_rating(my_track.ratings)
    @my_rank = 1

    tracks.map do |track|
      if average_rating(track.ratings) > @my_average_rating
        @my_rank += 1
      end
    end

    return @my_rank
  end

  def get_tracks_ordered_by_rank(tracks)
    ordered = {}

    tracks.map do |track|
      rank = competition_rank(tracks, track)
      ordered[track] = rank
    end

    return ordered.sort_by {|_key, value| value}
  end

  def average_rating(ratings)
    if ratings.size == 0
      return 0
    end

    ratings.sum(:score) / ratings.size
  end

  def enter_competition
    @track = Track.where("id = ?", params[:track_id]).first
    @track.update_attribute(:competition_id, params[:competition_id])
    render text: @track.title
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
      params.require(:competition).permit(:title, :startDate, :startTime, :endDate, :endTime, :constraints, :competition_id, :track_id)
    end
end
