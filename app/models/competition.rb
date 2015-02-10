class Competition < ActiveRecord::Base
  include PublicActivity::Common
  has_many :tracks
  validates :title, presence: true
  validates :startdate, presence: true
  validates :enddate, presence: true
end
