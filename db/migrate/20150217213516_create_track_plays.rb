class CreateTrackPlays < ActiveRecord::Migration
  def change
    create_table :track_plays do |t|
      t.integer :track_id
      t.integer :user_id

      t.timestamps
    end
  end
end
