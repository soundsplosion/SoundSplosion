require 'test_helper'

class UserControllerTest < ActionController::TestCase
  include Devise::TestHelpers
  test "should get show for existing user" do
    get :show, {'id' => '1'}
    assert_response :success
  end

end
