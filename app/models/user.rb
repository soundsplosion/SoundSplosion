class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  has_attached_file :avatar, :styles => { :medium => "300x300>", :thumb => "100x100#" }, :default_url => "/assets/default_user.png"
  validates_attachment_content_type :avatar, :content_type => /\Aimage\/.*\Z/
  
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :trackable, :validatable
  
  has_many :tracks

  has_many :comments

  has_many :ratings
  has_many :rated_tracks, :through => :ratings, :source => :track


  has_many :likes
  has_many :liked_tracks, :through => :likes, :source => :track

  has_many :favorites
  has_many :favorited_tracks, :through => :favorites, :source => :track
end
