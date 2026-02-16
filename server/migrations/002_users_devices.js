import Database from 'better-sqlite3';

const db = new Database('chottu.db');

db.exec(`
  -- Create users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Add user_id and last_seen_at to devices
  ALTER TABLE devices ADD COLUMN user_id TEXT;
  ALTER TABLE devices ADD COLUMN last_seen_at DATETIME;
  
  -- Create index for device lookups
  CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
  
  -- Migrate existing devices: create user per device token
  INSERT OR IGNORE INTO users (id)
  SELECT DISTINCT token FROM devices WHERE user_id IS NULL;
  
  UPDATE devices SET user_id = token WHERE user_id IS NULL;
  
  -- Update user_profiles to use real user_id
  -- (Already using user_id, no change needed)
  
  -- Update user_actions_new to use real user_id
  -- (Already using user_id, no change needed)
  
  -- Update user_preferences to use real user_id
  -- (Already using user_id, no change needed)
  
  -- Update suggestion_history to use real user_id
  -- (Already using user_id, no change needed)
`);

console.log('✓ Migration 002 completed: Users and devices');
db.close();
