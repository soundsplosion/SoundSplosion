require 'rails_helper'
require 'spec_helper'

describe Favorite do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:favorite)).to be_valid
  end
  it "is invalid without a track id" do
    expect(FactoryGirl.build(:favorite, track_id: nil)).to be_invalid 
  end
  it "is invalid without a user id" do
    expect(FactoryGirl.build(:favorite, user_id: nil)).to be_invalid 
  end
end
