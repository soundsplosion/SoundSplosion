require 'test_helper'

class CommentControllerTest < ActionController::TestCase
  include Devise::TestHelpers

  setup do
    @comment = comments(:one)
  end

  test "should create comment when all parameters are given" do
    assert_difference('Comment.count') do
      post :create, { track_id: @comment.track_id, body: @comment.body, user_id: @comment.user_id }
    end
  end
end
