class Track < ActiveRecord::Base
  belongs_to :competition
  belongs_to :user

  has_many :comments

  has_many :likes
  has_many :liking_users, :through => :likes, :source => :user

  has_many :favorites
  has_many :favoriting_users, :through => :favorites, :source => :user
end
