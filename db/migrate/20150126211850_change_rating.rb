class ChangeRating < ActiveRecord::Migration
  def change
    remove_column :ratings, :"0", :string
    remove_column :ratings, :default, :string
  end
end
