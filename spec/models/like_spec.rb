require 'rails_helper'
require 'spec_helper'

describe Like do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:like)).to be_valid
  end
  it "is invalid without a track id" do
    expect(FactoryGirl.build(:like, track_id: nil)).to be_invalid 
  end
  it "is invalid without a user id" do
    expect(FactoryGirl.build(:like, user_id: nil)).to be_invalid 
  end
end
