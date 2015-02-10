FactoryGirl.define do
  factory :user do
    sequence(:email) { |n| "person-#{n}@example.com" }
    sequence(:password) { |n| "password" }
  end

  factory :competition do 
    sequence(:title) { |n| "Title #{n}" }
    startdate        DateTime.now
    enddate          DateTime.now.tomorrow
    created_at       DateTime.now
    updated_at       ''
    constraints      ''
  end

  factory :track do 
    sequence(:title) { |n| "Track #{n}" }
    competition_id   ''
    user_id          '1'
    username         'test_user'
  end
end