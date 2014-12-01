namespace :db do
  desc "Fill database"
  task :populate => :environment do
    require 'populator'
    require 'faker'

    [User, Track].each(&:delete_all)

    User.populate 9 do |user|
      user.email              = Faker::Internet.email
      user.encrypted_password = "testtest"
      user.username           = Faker::Internet.user_name
      user.sign_in_count      = 1

    end

    Track.populate 10 do |track|
      track.title          = Faker::Lorem.word
      track.competition_id = 2
      track.image          = ""
      track.user_id        = Faker::Number.number(1)
    end
  end
end