class AddConstraintsToCompetitions < ActiveRecord::Migration
  def change
    add_column :competitions, :constraints, :string
  end
end
