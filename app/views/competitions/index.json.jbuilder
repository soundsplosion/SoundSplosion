json.array!(@competitions) do |competition|
  json.extract! competition, :id, :title, :startDate, :startTime, :endDate, :endTime
  json.url competition_url(competition, format: :json)
end
