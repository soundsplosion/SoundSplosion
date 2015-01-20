require 'test_helper'

class LikeControllerTest < ActionController::TestCase
  include Devise::TestHelpers

  setup do
    @like = likes(:one)
  end

  test "should be able to like track when all parameters are given" do
    assert_difference('Like.count') do
      post :create, { track_id: @like.track_id, user_id: @like.user_id }
    end
  end
end
