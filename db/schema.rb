# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20150129220451) do

  create_table "activities", force: true do |t|
    t.integer  "trackable_id"
    t.string   "trackable_type"
    t.integer  "owner_id"
    t.string   "owner_type"
    t.string   "key"
    t.text     "parameters"
    t.integer  "recipient_id"
    t.string   "recipient_type"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "activities", ["owner_id", "owner_type"], name: "index_activities_on_owner_id_and_owner_type"
  add_index "activities", ["recipient_id", "recipient_type"], name: "index_activities_on_recipient_id_and_recipient_type"
  add_index "activities", ["trackable_id", "trackable_type"], name: "index_activities_on_trackable_id_and_trackable_type"

  create_table "comments", force: true do |t|
    t.string   "body"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "track_id"
    t.integer  "user_id"
    t.string   "user_name"
    t.string   "strftime"
  end

  create_table "competitions", force: true do |t|
    t.string   "title"
    t.datetime "startDate"
    t.datetime "endDate"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "constraints"
  end

  create_table "favorites", force: true do |t|
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "track_id"
    t.integer  "user_id"
  end

  create_table "likes", force: true do |t|
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "track_id"
    t.integer  "user_id"
  end

  create_table "ratings", force: true do |t|
    t.integer  "track_id"
    t.integer  "user_id"
    t.integer  "score",      default: 0
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "ratings", ["track_id"], name: "index_ratings_on_track_id"
  add_index "ratings", ["user_id"], name: "index_ratings_on_user_id"

  create_table "tracks", force: true do |t|
    t.string   "title"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "competition_id"
    t.integer  "user_id"
    t.integer  "rank"
    t.string   "username"
  end

  create_table "users", force: true do |t|
    t.string   "email",                  default: "", null: false
    t.string   "encrypted_password",     default: "", null: false
    t.string   "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer  "sign_in_count",          default: 0,  null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string   "current_sign_in_ip"
    t.string   "last_sign_in_ip"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "image"
    t.string   "avatar_file_name"
    t.string   "avatar_content_type"
    t.integer  "avatar_file_size"
    t.datetime "avatar_updated_at"
  end

  add_index "users", ["email"], name: "index_users_on_email", unique: true
  add_index "users", ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true

end
