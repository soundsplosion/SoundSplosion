class ApplicationController < ActionController::Base
  include PublicActivity::StoreController
  before_filter :configure_permitted_parameters, if: :devise_controller?
  after_filter :store_location

  def configure_permitted_parameters
   devise_parameter_sanitizer.for(:sign_up) { |u| u.permit(:email, :username, :password, :password_confirmation) }
   devise_parameter_sanitizer.for(:account_update) { |u| u.permit(:email, :username, :password, :current_password, :avatar) }
  end

  def store_location
  # store last url as long as it isn't a /users path
  session[:previous_url] = request.fullpath unless request.fullpath =~ /\/users/
  end

  def after_sign_in_path_for(resource)
    session[:previous_url] || root_path
  end

  protect_from_forgery with: :exception
end
