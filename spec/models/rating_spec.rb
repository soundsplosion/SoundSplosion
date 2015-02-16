require 'rails_helper'
require 'spec_helper'

describe Rating do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:rating)).to be_valid
  end
  it "is invalid without a track id" do
    expect(FactoryGirl.build(:rating, track_id: nil)).to be_invalid 
  end
  it "is invalid without a user id" do
    expect(FactoryGirl.build(:rating, user_id: nil)).to be_invalid 
  end
  it "is invalid without a score" do
    expect(FactoryGirl.build(:rating, score: nil)).to be_invalid 
  end
end
