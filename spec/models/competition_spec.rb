require 'rails_helper'
require 'spec_helper'

describe Competition do 
  it "has a valid factory" do 
    expect(FactoryGirl.create(:competition)).to be_valid
  end
  it "is invalid without a title" do
    expect(FactoryGirl.build(:competition, title: nil)).to be_invalid 
  end
  it "is invalid without a startdate" do
    expect(FactoryGirl.build(:competition, startdate: nil)).to be_invalid 
  end
  it "is invalid without a enddate" do
    expect(FactoryGirl.build(:competition, enddate: nil)).to be_invalid 
  end
end
