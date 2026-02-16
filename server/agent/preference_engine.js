import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('chottu.db');
const CONFIDENCE_THRESHOLD = parseFloat(process.env.PREF_CONFIDENCE_THRESHOLD || '0.7');
const RETENTION_DAYS = parseInt(process.env.ACTION_RETENTION_DAYS || '90');

export function getProfile(userId) {
  // Ensure profile exists
  db.prepare('INSERT OR IGNORE INTO user_profiles (user_id, tone_preference) VALUES (?, "professional")').run(userId);
  
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  
  return {
    homeLocation: profile.home_location,
    preferredAirports: profile.preferred_airports ? JSON.parse(profile.preferred_airports) : [],
    budgetRange: profile.budget_range ? JSON.parse(profile.budget_range) : {},
    favoriteBrands: profile.favorite_brands ? JSON.parse(profile.favorite_brands) : [],
    frequentCities: profile.frequent_cities ? JSON.parse(profile.frequent_cities) : [],
    tonePreference: profile.tone_preference,
    notificationPrefs: profile.notification_prefs ? JSON.parse(profile.notification_prefs) : {}
  };
}

export function updateProfile(userId, updates) {
  // Ensure profile exists
  db.prepare('INSERT OR IGNORE INTO user_profiles (user_id, tone_preference) VALUES (?, "professional")').run(userId);
  
  const fields = [];
  const values = [];
  
  if (updates.homeLocation) {
    fields.push('home_location = ?');
    values.push(updates.homeLocation);
  }
  if (updates.preferredAirports) {
    fields.push('preferred_airports = ?');
    values.push(JSON.stringify(updates.preferredAirports));
  }
  if (updates.budgetRange) {
    fields.push('budget_range = ?');
    values.push(JSON.stringify(updates.budgetRange));
  }
  if (updates.favoriteBrands) {
    fields.push('favorite_brands = ?');
    values.push(JSON.stringify(updates.favoriteBrands));
  }
  if (updates.frequentCities) {
    fields.push('frequent_cities = ?');
    values.push(JSON.stringify(updates.frequentCities));
  }
  if (updates.tonePreference) {
    fields.push('tone_preference = ?');
    values.push(updates.tonePreference);
  }
  if (updates.notificationPrefs) {
    fields.push('notification_prefs = ?');
    values.push(JSON.stringify(updates.notificationPrefs));
  }
  
  if (fields.length === 0) return;
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(userId);
  
  db.prepare(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
}

export function logAction(userId, eventType, data) {
  const { intent, entities, status = 'success', confidence = 1.0, source = 'text', latencyMs, partial } = data;
  
  // Only log final transcripts for voice (skip partial)
  if (source === 'voice' && partial === true) return;
  
  // Only log if confidence meets threshold
  if (status === 'success' && confidence < CONFIDENCE_THRESHOLD) return;
  
  // Skip failed/canceled
  if (status === 'fail' || status === 'cancel') return;
  
  // Safe JSON parsing for entities
  let entitiesJson = '{}';
  try {
    entitiesJson = JSON.stringify(entities || {});
    if (entitiesJson.length > 10000) {
      entitiesJson = JSON.stringify({ error: 'entities too large' });
    }
  } catch (e) {
    entitiesJson = JSON.stringify({ error: 'invalid entities' });
  }
  
  // Generate dedupe hash
  const dedupeHash = crypto.createHash('md5')
    .update(`${userId}:${eventType}:${entitiesJson}`)
    .digest('hex');
  
  // Check for duplicate within 10 seconds
  const recent = db.prepare(`
    SELECT id FROM user_actions_new 
    WHERE user_id = ? AND dedupe_hash = ? AND created_at > datetime('now', '-10 seconds')
  `).get(userId, dedupeHash);
  
  if (recent) return;
  
  // Insert action
  db.prepare(`
    INSERT INTO user_actions_new (user_id, event_type, intent, entities_json, status, confidence, source, dedupe_hash, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, eventType, intent, entitiesJson, status, confidence, source, dedupeHash, latencyMs);
  
  // Update preferences if high confidence
  if (confidence >= CONFIDENCE_THRESHOLD) {
    updatePreferences(userId, eventType, entities);
  }
}

function updatePreferences(userId, eventType, entities) {
  if (eventType === 'route_search' && entities?.origin && entities?.destination) {
    const key = 'frequent_route';
    const value = `${entities.origin}-${entities.destination}`;
    upsertPreference(userId, key, value);
  }
  
  if ((eventType === 'deal_view' || eventType === 'purchase') && entities?.price) {
    const key = 'budget_avg';
    const existing = db.prepare('SELECT pref_value, evidence_count FROM user_preferences WHERE user_id = ? AND pref_key = ?').get(userId, key);
    
    if (existing) {
      const oldAvg = parseFloat(existing.pref_value);
      const count = existing.evidence_count;
      const newAvg = (oldAvg * count + entities.price) / (count + 1);
      upsertPreference(userId, key, newAvg.toString());
    } else {
      upsertPreference(userId, key, entities.price.toString());
    }
  }
}

function upsertPreference(userId, key, value) {
  const existing = db.prepare('SELECT * FROM user_preferences WHERE user_id = ? AND pref_key = ?').get(userId, key);
  
  if (existing) {
    const newCount = existing.evidence_count + 1;
    const newConfidence = Math.min(0.95, existing.confidence + 0.05);
    
    db.prepare(`
      UPDATE user_preferences 
      SET pref_value = ?, confidence = ?, evidence_count = ?, evidence_last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND pref_key = ?
    `).run(value, newConfidence, newCount, userId, key);
  } else {
    db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, confidence, evidence_count)
      VALUES (?, ?, ?, 0.5, 1)
    `).run(userId, key, value);
  }
}

export function getRecentActions(userId, limit = 20) {
  return db.prepare(`
    SELECT event_type, intent, entities_json, status, confidence, source, created_at 
    FROM user_actions_new 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(userId, limit).map(a => ({
    type: a.event_type,
    intent: a.intent,
    entities: JSON.parse(a.entities_json || '{}'),
    status: a.status,
    confidence: a.confidence,
    source: a.source,
    timestamp: a.created_at
  }));
}

export function inferPreferences(userId) {
  const prefs = db.prepare(`
    SELECT pref_key, pref_value, confidence, evidence_count, evidence_last_seen
    FROM user_preferences
    WHERE user_id = ? AND confidence >= 0.6
    ORDER BY confidence DESC
  `).all(userId);
  
  const result = {
    frequentRoutes: [],
    budgetPatterns: {},
    searchPatterns: []
  };
  
  prefs.forEach(p => {
    if (p.pref_key === 'frequent_route') {
      result.frequentRoutes.push({
        route: p.pref_value,
        confidence: p.confidence,
        count: p.evidence_count
      });
    }
    if (p.pref_key === 'budget_avg') {
      result.budgetPatterns.avg = parseFloat(p.pref_value);
      result.budgetPatterns.confidence = p.confidence;
    }
  });
  
  return result;
}

export function applyPersonalization(userId, toolName, input, result) {
  const preferences = inferPreferences(userId);
  const personalization = { applied: false, basedOn: [] };
  
  if (toolName === 'route_planner' && preferences.frequentRoutes.length > 0) {
    const topRoute = preferences.frequentRoutes[0];
    if (topRoute.confidence >= 0.6) {
      personalization.applied = true;
      personalization.basedOn.push('frequent_routes');
      personalization.message = `You frequently travel: ${topRoute.route} (confidence: ${(topRoute.confidence * 100).toFixed(0)}%)`;
    }
  }
  
  if (toolName === 'deal_finder' && preferences.budgetPatterns.avg) {
    if (preferences.budgetPatterns.confidence >= 0.6) {
      personalization.applied = true;
      personalization.basedOn.push('budget_preference');
      personalization.message = `Your typical budget: $${Math.round(preferences.budgetPatterns.avg)}`;
    }
  }
  
  return personalization;
}

export function cleanupOldActions() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare('DELETE FROM user_actions_new WHERE created_at < ?').run(cutoff);
  return result.changes;
}
