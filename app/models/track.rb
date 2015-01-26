class Track < ActiveRecord::Base
  belongs_to :competition
  belongs_to :user

  has_many :comments

  has_many :ratings
  has_many :rated_users, :through => :ratings, :source => :user

  has_many :likes
  has_many :liked_users, :through => :likes, :source => :user

  has_many :favorites
  has_many :favorited_users, :through => :favorites, :source => :user
end
