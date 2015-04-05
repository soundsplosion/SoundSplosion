Rails.application.routes.draw do
  get 'user/index'
  get 'competitions/enter_competition', :to => 'competitions#enter_competition'
  get 'competitions/new_entry/:id', :to => 'competitions#new_entry'
  get 'tracks/check_constraints', :to => 'tracks#check_constraints'
  resources :competitions
  get 'tracks/tutorial', to: 'tracks#tutorial.html'
  resources :tracks
  resources :upload
  resources :user
  delete 'comment', :to => 'comment#destroy'
  resources :comment
  delete 'like', :to => 'like#destroy'
  resources :like
  delete 'favorite', :to => 'favorite#destroy'
  resources :favorite
  resources :ratings
  resources :track_play
  
  devise_for :users, :controllers => {:registrations => "my_devise/registrations"}
  get 'welcome/index'
  get '/about', :to => 'welcome#about'
  root 'welcome#index'
  get 'tracks/keyboard.html', to: 'tracks#keyboard.html'

  # The priority is based upon order of creation: first created -> highest priority.
  # See how all your routes lay out with "rake routes".

  # You can have the root of your site routed with "root"
  # root 'welcome#index'

  # Example of regular route:
  #   get 'products/:id' => 'catalog#view'

  # Example of named route that can be invoked with purchase_url(id: product.id)
  #   get 'products/:id/purchase' => 'catalog#purchase', as: :purchase

  # Example resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  # Example resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Example resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Example resource route with more complex sub-resources:
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', on: :collection
  #     end
  #   end

  # Example resource route with concerns:
  #   concern :toggleable do
  #     post 'toggle'
  #   end
  #   resources :posts, concerns: :toggleable
  #   resources :photos, concerns: :toggleable

  # Example resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end
end
