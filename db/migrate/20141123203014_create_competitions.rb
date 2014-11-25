class CreateCompetitions < ActiveRecord::Migration
  def change
    create_table :competitions do |t|
      t.string :title
      t.date :startDate
      t.time :startTime
      t.date :endDate
      t.time :endTime

      t.timestamps
    end
  end
end
