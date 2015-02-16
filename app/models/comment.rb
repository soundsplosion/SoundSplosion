class Comment < ActiveRecord::Base
  include PublicActivity::Common
  validates :body, presence: true
  validates :track_id, presence: true
  validates :user_id, presence: true
  validates :user_name, presence: true
  
  belongs_to :user
  belongs_to :track
end
