class Rating < ActiveRecord::Base
  include PublicActivity::Common
  
  belongs_to :track
  belongs_to :user
  validates_uniqueness_of :track_id, scope: :user_id
end
