class Favorite < ActiveRecord::Base
  belongs_to :user
  belongs_to :tracks
  validates_uniqueness_of :track_id, scope: :user_id
end
