import Database from 'better-sqlite3';

const db = new Database('chottu.db');

db.exec(`
  DROP TABLE IF EXISTS user_actions_old;
  
  CREATE TABLE IF NOT EXISTS user_actions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    intent TEXT,
    entities_json TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    confidence REAL DEFAULT 1.0,
    source TEXT DEFAULT 'text',
    dedupe_hash TEXT,
    latency_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions_new(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_actions_dedupe ON user_actions_new(dedupe_hash, created_at);
  CREATE INDEX IF NOT EXISTS idx_user_actions_created ON user_actions_new(created_at);
  
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    pref_key TEXT NOT NULL,
    pref_value TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    evidence_last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    evidence_window_days INTEGER DEFAULT 90,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, pref_key)
  );
  
  CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
  
  CREATE TABLE IF NOT EXISTS suggestion_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    suggestion_data TEXT,
    dismissed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_suggestion_history_user_id ON suggestion_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_suggestion_history_type ON suggestion_history(user_id, suggestion_type, created_at);
`);

console.log('✓ Migration completed');
db.close();
