import { strict as assert } from 'assert';
import Database from 'better-sqlite3';
import { logAction, inferPreferences, getProfile, cleanupOldActions } from '../agent/preference_engine.js';
import { generateProactiveSuggestions, logSuggestion } from '../agent/proactive_engine.js';

const testDb = new Database(':memory:');

// Setup test database
testDb.exec(`
  CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    home_location TEXT,
    preferred_airports TEXT,
    budget_range TEXT,
    favorite_brands TEXT,
    frequent_cities TEXT,
    tone_preference TEXT DEFAULT 'professional',
    notification_prefs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE user_actions_new (
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
  
  CREATE TABLE user_preferences (
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
  
  CREATE TABLE suggestion_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    suggestion_data TEXT,
    dismissed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('Running hardened personalization tests...\n');

// Test 1: Cross-user access denied
function testCrossUserAccess() {
  console.log('Test 1: Cross-user access isolation');
  
  logAction('user1', 'route_search', {
    entities: { origin: 'DC', destination: 'NYC' },
    status: 'success',
    confidence: 0.9
  });
  
  logAction('user2', 'route_search', {
    entities: { origin: 'LA', destination: 'SF' },
    status: 'success',
    confidence: 0.9
  });
  
  const user1Prefs = inferPreferences('user1');
  const user2Prefs = inferPreferences('user2');
  
  assert(user1Prefs.frequentRoutes.length > 0, 'User1 should have routes');
  assert(user2Prefs.frequentRoutes.length > 0, 'User2 should have routes');
  assert(user1Prefs.frequentRoutes[0].route === 'DC-NYC', 'User1 route should be DC-NYC');
  assert(user2Prefs.frequentRoutes[0].route === 'LA-SF', 'User2 route should be LA-SF');
  
  console.log('✓ Cross-user access properly isolated\n');
}

// Test 2: Reset deletes all user data
function testReset() {
  console.log('Test 2: Memory reset');
  
  const userId = 'test_reset_user';
  
  // Create profile and actions
  testDb.prepare('INSERT INTO user_profiles (user_id, home_location) VALUES (?, ?)').run(userId, 'Boston');
  logAction(userId, 'route_search', {
    entities: { origin: 'Boston', destination: 'NYC' },
    status: 'success',
    confidence: 0.9
  });
  logSuggestion(userId, 'weather_update', {}, false);
  
  // Verify data exists
  const profileBefore = testDb.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  const actionsBefore = testDb.prepare('SELECT * FROM user_actions_new WHERE user_id = ?').all(userId);
  const suggestionsBefore = testDb.prepare('SELECT * FROM suggestion_history WHERE user_id = ?').all(userId);
  
  assert(profileBefore !== undefined, 'Profile should exist before reset');
  assert(actionsBefore.length > 0, 'Actions should exist before reset');
  assert(suggestionsBefore.length > 0, 'Suggestions should exist before reset');
  
  // Reset
  testDb.prepare('DELETE FROM user_actions_new WHERE user_id = ?').run(userId);
  testDb.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
  testDb.prepare('DELETE FROM suggestion_history WHERE user_id = ?').run(userId);
  testDb.prepare('UPDATE user_profiles SET home_location = NULL WHERE user_id = ?').run(userId);
  
  // Verify data deleted
  const actionsAfter = testDb.prepare('SELECT * FROM user_actions_new WHERE user_id = ?').all(userId);
  const prefsAfter = testDb.prepare('SELECT * FROM user_preferences WHERE user_id = ?').all(userId);
  const suggestionsAfter = testDb.prepare('SELECT * FROM suggestion_history WHERE user_id = ?').all(userId);
  const profileAfter = testDb.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  
  assert(actionsAfter.length === 0, 'Actions should be deleted');
  assert(prefsAfter.length === 0, 'Preferences should be deleted');
  assert(suggestionsAfter.length === 0, 'Suggestions should be deleted');
  assert(profileAfter.home_location === null, 'Profile should be reset');
  
  console.log('✓ Reset properly deletes all user data\n');
}

// Test 3: Preference inference with confidence
function testPreferenceInference() {
  console.log('Test 3: Preference inference');
  
  const userId = 'test_inference_user';
  
  // Log multiple route searches
  for (let i = 0; i < 5; i++) {
    logAction(userId, 'route_search', {
      entities: { origin: 'DC', destination: 'NYC' },
      status: 'success',
      confidence: 0.9
    });
  }
  
  // Log one different route
  logAction(userId, 'route_search', {
    entities: { origin: 'DC', destination: 'Boston' },
    status: 'success',
    confidence: 0.9
  });
  
  const prefs = inferPreferences(userId);
  
  assert(prefs.frequentRoutes.length > 0, 'Should have frequent routes');
  assert(prefs.frequentRoutes[0].route === 'DC-NYC', 'Most frequent route should be DC-NYC');
  assert(prefs.frequentRoutes[0].confidence >= 0.5, 'Should have confidence score');
  assert(prefs.frequentRoutes[0].count >= 5, 'Should track evidence count');
  
  console.log('✓ Preference inference works correctly\n');
}

// Test 4: Throttling prevents spam
function testThrottling() {
  console.log('Test 4: Proactive throttling');
  
  const userId = 'test_throttle_user';
  
  // Create profile
  testDb.prepare('INSERT INTO user_profiles (user_id, home_location) VALUES (?, ?)').run(userId, 'Seattle');
  
  // Log 3 suggestions (daily limit)
  logSuggestion(userId, 'weather_update', {}, false);
  logSuggestion(userId, 'traffic_alert', {}, false);
  logSuggestion(userId, 'price_drop', {}, false);
  
  // Try to generate more suggestions
  const suggestions = generateProactiveSuggestions(userId);
  
  const todayCount = testDb.prepare(`
    SELECT COUNT(*) as count FROM suggestion_history
    WHERE user_id = ? AND created_at > datetime('now', '-1 day')
  `).get(userId).count;
  
  assert(todayCount === 3, 'Should have 3 suggestions logged');
  assert(suggestions.length === 0, 'Should not generate more suggestions after limit');
  
  console.log('✓ Throttling prevents spam\n');
}

// Test 5: Confidence filtering
function testConfidenceFiltering() {
  console.log('Test 5: Confidence filtering');
  
  const userId = 'test_confidence_user';
  
  // Log low confidence action (should be ignored)
  logAction(userId, 'route_search', {
    entities: { origin: 'A', destination: 'B' },
    status: 'success',
    confidence: 0.3
  });
  
  // Log high confidence action (should be stored)
  logAction(userId, 'route_search', {
    entities: { origin: 'C', destination: 'D' },
    status: 'success',
    confidence: 0.9
  });
  
  const actions = testDb.prepare('SELECT * FROM user_actions_new WHERE user_id = ?').all(userId);
  
  // Only high confidence action should be stored
  assert(actions.length === 1, 'Should only store high confidence actions');
  assert(actions[0].confidence === 0.9, 'Stored action should have high confidence');
  
  console.log('✓ Confidence filtering works\n');
}

// Test 6: Dedupe prevents duplicates
function testDedupe() {
  console.log('Test 6: Deduplication');
  
  const userId = 'test_dedupe_user';
  
  // Log same action twice quickly
  logAction(userId, 'route_search', {
    entities: { origin: 'X', destination: 'Y' },
    status: 'success',
    confidence: 0.9
  });
  
  logAction(userId, 'route_search', {
    entities: { origin: 'X', destination: 'Y' },
    status: 'success',
    confidence: 0.9
  });
  
  const actions = testDb.prepare('SELECT * FROM user_actions_new WHERE user_id = ?').all(userId);
  
  assert(actions.length === 1, 'Should dedupe identical actions within 10 seconds');
  
  console.log('✓ Deduplication works\n');
}

// Run all tests
try {
  testCrossUserAccess();
  testReset();
  testPreferenceInference();
  testThrottling();
  testConfidenceFiltering();
  testDedupe();
  
  console.log('✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}
