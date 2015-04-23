class AddMaxPatternsToCompetitions < ActiveRecord::Migration
  def change
    add_column :competitions, :min_patterns, :integer
    add_column :competitions, :max_patterns, :integer
  end
end
