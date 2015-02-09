class RenameCompetitionsColumns < ActiveRecord::Migration
  def change
    rename_column :competitions, :startDate, :startdate
    rename_column :competitions, :endDate, :enddate
  end
end
