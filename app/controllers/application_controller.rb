class ApplicationController < ActionController::Base
  include PublicActivity::StoreController
  before_filter :configure_permitted_parameters, if: :devise_controller?

  def configure_permitted_parameters
   devise_parameter_sanitizer.for(:sign_up) { |u| u.permit(:email, :username, :password, :password_confirmation) }
   devise_parameter_sanitizer.for(:account_update) { |u| u.permit(:email, :username, :password, :current_password, :avatar) }
  end

  protect_from_forgery with: :exception
end
