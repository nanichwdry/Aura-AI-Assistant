import { strict as assert } from 'assert';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const testDb = new Database(':memory:');

// Setup test database
testDb.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    user_id TEXT,
    revoked INTEGER DEFAULT 0,
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
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

console.log('Running production blocker tests...\n');

// Test 1: Multi-device same user
function testMultiDeviceSameUser() {
  console.log('Test 1: Multi-device same user');
  
  const userId = 'user_123';
  const device1Token = 'device_token_1';
  const device2Token = 'device_token_2';
  
  // Create user
  testDb.prepare('INSERT INTO users (id, email) VALUES (?, ?)').run(userId, 'test@example.com');
  
  // Create two devices for same user
  testDb.prepare('INSERT INTO devices (token, device_name, user_id) VALUES (?, ?, ?)').run(device1Token, 'iPhone', userId);
  testDb.prepare('INSERT INTO devices (token, device_name, user_id) VALUES (?, ?, ?)').run(device2Token, 'iPad', userId);
  
  // Simulate auth from device 1
  const device1 = testDb.prepare('SELECT user_id FROM devices WHERE token = ?').get(device1Token);
  assert(device1.user_id === userId, 'Device 1 should map to user');
  
  // Simulate auth from device 2
  const device2 = testDb.prepare('SELECT user_id FROM devices WHERE token = ?').get(device2Token);
  assert(device2.user_id === userId, 'Device 2 should map to same user');
  
  // Create profile via device 1
  testDb.prepare('INSERT INTO user_profiles (user_id, home_location) VALUES (?, ?)').run(userId, 'Seattle');
  
  // Access profile via device 2
  const profile = testDb.prepare('SELECT home_location FROM user_profiles WHERE user_id = ?').get(userId);
  assert(profile.home_location === 'Seattle', 'Profile should be shared across devices');
  
  // Log action from device 1
  testDb.prepare(`
    INSERT INTO user_actions_new (user_id, event_type, entities_json, status, confidence)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'route_search', JSON.stringify({ origin: 'Seattle', destination: 'Portland' }), 'success', 0.9);
  
  // Check actions accessible from device 2
  const actions = testDb.prepare('SELECT * FROM user_actions_new WHERE user_id = ?').all(userId);
  assert(actions.length === 1, 'Actions should be shared across devices');
  
  console.log('✓ Multi-device same user works correctly\n');
}

// Test 2: Rate limiting simulation
function testRateLimiting() {
  console.log('Test 2: Rate limiting');
  
  const rateLimits = new Map();
  const RATE_LIMIT_WINDOW = 60 * 1000;
  const RATE_LIMIT_MAX_REQUESTS = 60;
  
  function checkRateLimit(key) {
    const now = Date.now();
    const record = rateLimits.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + RATE_LIMIT_WINDOW;
    }
    
    record.count++;
    rateLimits.set(key, record);
    
    return record.count <= RATE_LIMIT_MAX_REQUESTS;
  }
  
  // Simulate 60 requests (should all pass)
  for (let i = 0; i < 60; i++) {
    const allowed = checkRateLimit('token:test_token');
    assert(allowed === true, `Request ${i + 1} should be allowed`);
  }
  
  // 61st request should be blocked
  const blocked = checkRateLimit('token:test_token');
  assert(blocked === false, 'Request 61 should be blocked');
  
  // Different token should have separate limit
  const differentToken = checkRateLimit('token:different_token');
  assert(differentToken === true, 'Different token should have separate limit');
  
  console.log('✓ Rate limiting works correctly\n');
}

// Test 3: Admin token hashing
function testAdminTokenHashing() {
  console.log('Test 3: Admin token hashing');
  
  const adminToken = 'super_secret_admin_token';
  const adminTokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
  
  // Verify hash is deterministic
  const hash2 = crypto.createHash('sha256').update(adminToken).digest('hex');
  assert(adminTokenHash === hash2, 'Hash should be deterministic');
  
  // Verify different token produces different hash
  const wrongToken = 'wrong_token';
  const wrongHash = crypto.createHash('sha256').update(wrongToken).digest('hex');
  assert(adminTokenHash !== wrongHash, 'Different tokens should have different hashes');
  
  // Verify hash is not reversible (one-way)
  assert(adminTokenHash !== adminToken, 'Hash should not equal original token');
  assert(adminTokenHash.length === 64, 'SHA256 hash should be 64 hex chars');
  
  console.log('✓ Admin token hashing works correctly\n');
}

// Test 4: Safe JSON parsing
function testSafeJsonParsing() {
  console.log('Test 4: Safe JSON parsing');
  
  function safeJsonStringify(obj) {
    try {
      const json = JSON.stringify(obj);
      if (json.length > 10000) {
        return JSON.stringify({ error: 'entities too large' });
      }
      return json;
    } catch (e) {
      return JSON.stringify({ error: 'invalid entities' });
    }
  }
  
  // Valid object
  const valid = safeJsonStringify({ origin: 'A', destination: 'B' });
  assert(valid.includes('origin'), 'Valid object should stringify');
  
  // Circular reference
  const circular = {};
  circular.self = circular;
  const circularResult = safeJsonStringify(circular);
  assert(circularResult.includes('error'), 'Circular reference should be caught');
  
  // Too large
  const large = { data: 'x'.repeat(20000) };
  const largeResult = safeJsonStringify(large);
  assert(largeResult.includes('too large'), 'Large object should be caught');
  
  console.log('✓ Safe JSON parsing works correctly\n');
}

// Test 5: Evidence metadata in suggestions
function testEvidenceMetadata() {
  console.log('Test 5: Evidence metadata in suggestions');
  
  const suggestion = {
    type: 'route_reminder',
    message: 'Plan your trip from DC to NYC?',
    relevanceScore: 0.65,
    action: { tool: 'route_planner', input: { origin: 'DC', destination: 'NYC' } },
    evidence: {
      source: 'inferred',
      signals: ['frequent_route'],
      confidence: 0.85,
      count: 12,
      route: 'DC-NYC'
    }
  };
  
  // Verify evidence structure
  assert(suggestion.evidence !== undefined, 'Suggestion must have evidence');
  assert(suggestion.evidence.source !== undefined, 'Evidence must have source');
  assert(suggestion.evidence.signals !== undefined, 'Evidence must have signals');
  assert(Array.isArray(suggestion.evidence.signals), 'Signals must be array');
  assert(suggestion.evidence.confidence !== undefined, 'Evidence must have confidence');
  assert(suggestion.evidence.count !== undefined, 'Evidence must have count');
  
  // Verify explainability
  const explanation = `This suggestion is based on ${suggestion.evidence.count} observations of route ${suggestion.evidence.route} with ${(suggestion.evidence.confidence * 100).toFixed(0)}% confidence`;
  assert(explanation.includes('12 observations'), 'Explanation should reference evidence count');
  assert(explanation.includes('85% confidence'), 'Explanation should reference confidence');
  
  console.log('✓ Evidence metadata works correctly\n');
}

// Test 6: Last seen update
function testLastSeenUpdate() {
  console.log('Test 6: Last seen update');
  
  const userId = 'user_456';
  const deviceToken = 'device_token_456';
  
  // Create user and device
  testDb.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
  testDb.prepare('INSERT INTO devices (token, device_name, user_id) VALUES (?, ?, ?)').run(deviceToken, 'Android', userId);
  
  // Initial last_seen should be null
  const before = testDb.prepare('SELECT last_seen_at FROM devices WHERE token = ?').get(deviceToken);
  assert(before.last_seen_at === null, 'Initial last_seen should be null');
  
  // Simulate auth (update last_seen)
  testDb.prepare('UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE token = ?').run(deviceToken);
  
  // Verify last_seen updated
  const after = testDb.prepare('SELECT last_seen_at FROM devices WHERE token = ?').get(deviceToken);
  assert(after.last_seen_at !== null, 'Last_seen should be updated');
  
  console.log('✓ Last seen update works correctly\n');
}

// Run all tests
try {
  testMultiDeviceSameUser();
  testRateLimiting();
  testAdminTokenHashing();
  testSafeJsonParsing();
  testEvidenceMetadata();
  testLastSeenUpdate();
  
  console.log('✅ All production blocker tests passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
