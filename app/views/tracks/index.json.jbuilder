json.array!(@tracks) do |track|
  json.extract! track, :id, :title
  json.url track_url(track, format: :json)
end
