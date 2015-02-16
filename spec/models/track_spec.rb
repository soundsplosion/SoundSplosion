require 'rails_helper'
require 'spec_helper'

describe Track do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:track)).to be_valid
  end
  it "is invalid without a title" do
    expect(FactoryGirl.build(:track, title: nil)).to be_invalid 
  end
  it "is invalid without a username" do
    expect(FactoryGirl.build(:track, username: nil)).to be_invalid 
  end
end
