class Track < ActiveRecord::Base
  include PublicActivity::Common
  validates :title, presence: true
  validates :user_id, presence: true
  validates :username, presence: true
  
  belongs_to :competition
  belongs_to :user

  has_many :comments

  has_many :ratings
  has_many :rated_users, :through => :ratings, :source => :user

  has_many :likes
  has_many :liked_users, :through => :likes, :source => :user

  has_many :favorites
  has_many :favorited_users, :through => :favorites, :source => :user

  has_many :track_plays
  has_many :track_playing_users, :through => :track_plays, :source => :user
end
