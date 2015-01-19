class AddIdsToLikesAndFavorites < ActiveRecord::Migration
  def change
    add_column :likes, :track_id, :integer
    add_column :likes, :user_id, :integer

    add_column :favorites, :track_id, :integer
    add_column :favorites, :user_id, :integer
  end
end
