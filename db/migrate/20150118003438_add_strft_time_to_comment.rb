class AddStrftTimeToComment < ActiveRecord::Migration
  def change
    add_column :comments, :strftime, :string
  end
end
