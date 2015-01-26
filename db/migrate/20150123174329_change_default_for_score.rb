class ChangeDefaultForScore < ActiveRecord::Migration
  def change
    change_column :ratings, :score, :integer, :default => 0
  end

   def down
    remove_column :ratings, :"0", :string
    remove_column :ratings, :default, :string
  end
end
