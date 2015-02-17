class Like < ActiveRecord::Base
  include PublicActivity::Common
  validates :track_id, presence: true
  validates :user_id, presence: true
  
  belongs_to :user
  validates_uniqueness_of :track_id, scope: :user_id
end
