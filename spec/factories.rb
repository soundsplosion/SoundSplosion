FactoryGirl.define do
  factory :user do
    sequence(:email) { |n| "person-#{n}@example.com" }
    sequence(:password) { |n| "password" }
  end

  factory :competition do 
    sequence(:title) { |n| "Title #{n}" }
    startDate        DateTime.now
    endDate          DateTime.now.tomorrow
    created_at       DateTime.now
    updated_at       ''
    constraints      ''
  end

  factory :track do 
    sequence(:title) { |n| "Track #{n}" }
  end
end