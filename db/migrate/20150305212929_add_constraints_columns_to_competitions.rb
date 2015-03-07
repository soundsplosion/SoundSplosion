class AddConstraintsColumnsToCompetitions < ActiveRecord::Migration
  def change
   add_column :competitions, :min_tracks, :integer
   add_column :competitions, :max_tracks, :integer
   add_column :competitions, :min_instruments, :integer
   add_column :competitions, :max_instruments, :integer
   add_column :competitions, :min_notes, :integer
   add_column :competitions, :max_notes, :integer
   add_column :competitions, :min_effects, :integer
   add_column :competitions, :max_effects, :integer
  end
end
