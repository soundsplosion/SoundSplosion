class AddIdsToComment < ActiveRecord::Migration
  def change
    add_column :comments, :track_id, :integer
    add_column :comments, :user_id, :integer
  end
end
