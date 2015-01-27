class Competition < ActiveRecord::Base
  include PublicActivity::Common
  has_many :tracks
end
