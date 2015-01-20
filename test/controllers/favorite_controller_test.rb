require 'test_helper'

class FavoriteControllerTest < ActionController::TestCase
  include Devise::TestHelpers

  setup do
    @favorite = favorites(:one)
  end

  test "should be able to favorite track when all parameters are given" do
    assert_difference('Favorite.count') do
      post :create, { track_id: @favorite.track_id, user_id: @favorite.user_id }
    end
  end
end
