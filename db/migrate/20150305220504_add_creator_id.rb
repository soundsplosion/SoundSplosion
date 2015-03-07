class AddCreatorId < ActiveRecord::Migration
  def change
    add_column :competitions, :creator_id, :integer
  end
end
