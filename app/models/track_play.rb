class TrackPlay < ActiveRecord::Base
  belongs_to :user
  belongs_to :tracks
end
