require 'rails_helper'
require 'spec_helper'

describe Comment do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:comment)).to be_valid
  end
  it "is invalid without a body" do
    expect(FactoryGirl.build(:comment, body: nil)).to be_invalid 
  end
  it "is invalid without a track id" do
    expect(FactoryGirl.build(:comment, track_id: nil)).to be_invalid 
  end
  it "is invalid without a user id" do
    expect(FactoryGirl.build(:comment, user_id: nil)).to be_invalid 
  end
  it "is invalid without a username" do
    expect(FactoryGirl.build(:comment, user_name: nil)).to be_invalid 
  end
end
