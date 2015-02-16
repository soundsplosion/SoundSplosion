require 'rails_helper'
require 'spec_helper'

RSpec.describe "Competition", :type => :request do
  describe "CompetitionShowPage" do
    it "displays competition title and constraints" do
      user = FactoryGirl.create(:user)
      competition = FactoryGirl.create(:competition)
      track = FactoryGirl.create(:track)

      post_via_redirect user_session_path, 'user[email]' => user.email, 'user[password]' => user.password
      visit "/competitions/" + competition.id.to_s

      expect(page).to have_text(competition.title)
      expect(page).to have_text(competition.constraints)
    end
  end
end
