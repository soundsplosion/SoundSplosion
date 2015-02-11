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
    user_id          '1'
    username         'test_user'
  end

  factory :rating do 
    track_id       '1'
    user_id        '1'
    score          '1'
  end

  factory :comment do 
    body       '.'
    track_id   '1'
    user_id    '1'
    user_name  'test'
  end

  factory :like do 
    track_id   '1'
    user_id    '1'
  end

  factory :favorite do 
    track_id   '1'
    user_id    '1'
  end
end