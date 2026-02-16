# Hardened Personalization Configuration

## Environment Variables

Add to `server/.env`:

```bash
# Confidence threshold for learning (0.0-1.0)
PREF_CONFIDENCE_THRESHOLD=0.7

# Action retention period in days
ACTION_RETENTION_DAYS=90

# Admin tokens (comma-separated)
ADMIN_TOKENS=admin_token_1,admin_token_2
```

## Configuration Thresholds

### Learning Confidence
- **Default**: 0.7
- **Range**: 0.0 - 1.0
- **Purpose**: Only actions with confidence >= threshold are used for learning
- **Recommendation**: 
  - 0.6-0.7 for balanced learning
  - 0.8+ for high-precision learning
  - Lower values = more data, less accurate
  - Higher values = less data, more accurate

### Personalization Confidence
- **Route suggestions**: 0.6 minimum
- **Budget recommendations**: 0.6 minimum
- **Purpose**: Only apply personalization when confidence meets threshold
- **Hardcoded in**: `preference_engine.js` - `applyPersonalization()`

### Proactive Throttling

#### Daily Limits
- **Max suggestions per day**: 3
- **Hardcoded in**: `proactive_engine.js` - `MAX_SUGGESTIONS_PER_DAY`

#### Category Cooldowns
- **Traffic alerts**: 4 hours
- **Weather updates**: 12 hours
- **Price drops**: 24 hours
- **Route reminders**: 24 hours
- **Hardcoded in**: `proactive_engine.js` - `COOLDOWNS`

#### Dismissal Threshold
- **Max dismissal rate**: 0.5 (50%)
- **Purpose**: If user dismisses >50% of a category, stop suggesting it
- **Hardcoded in**: `proactive_engine.js` - `getDismissalRate()`

### Deduplication
- **Window**: 10 seconds
- **Purpose**: Ignore duplicate actions within window
- **Hardcoded in**: `preference_engine.js` - `logAction()`

### Retention Policy
- **Default**: 90 days
- **Configurable**: `ACTION_RETENTION_DAYS` env var
- **Purpose**: Delete raw actions older than retention period
- **Cleanup**: Run `POST /api/personalization/admin/cleanup` (admin only)

## Security Model

### Authentication
- All personalization endpoints require authentication
- User ID derived from device token (not URL parameter)
- Admin endpoints require admin token

### Authorization
- Users can only access their own data
- Admin can access any user data via `/admin/*` endpoints
- Cross-user access automatically denied

### Data Isolation
- Each user's data completely isolated
- No shared preferences across users
- Reset deletes all user data (actions, preferences, suggestions, profile)

## Database Schema

### user_actions_new
```sql
CREATE TABLE user_actions_new (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- tool_run, chat, route_search, etc.
  intent TEXT,                      -- parsed intent
  entities_json TEXT,               -- JSON entities
  status TEXT DEFAULT 'success',   -- success, fail, cancel
  confidence REAL DEFAULT 1.0,     -- 0.0-1.0
  source TEXT DEFAULT 'text',      -- text, voice, ui
  dedupe_hash TEXT,                -- MD5 hash for deduplication
  latency_ms INTEGER,              -- execution time
  created_at DATETIME
);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  pref_key TEXT NOT NULL,          -- frequent_route, budget_avg, etc.
  pref_value TEXT NOT NULL,        -- value
  confidence REAL DEFAULT 0.5,     -- 0.0-1.0
  evidence_count INTEGER DEFAULT 1,-- number of observations
  evidence_last_seen DATETIME,     -- last observation
  evidence_window_days INTEGER,    -- observation window
  updated_at DATETIME,
  UNIQUE(user_id, pref_key)
);
```

### suggestion_history
```sql
CREATE TABLE suggestion_history (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,   -- traffic_alert, weather_update, etc.
  suggestion_data TEXT,            -- JSON data
  dismissed INTEGER DEFAULT 0,     -- 0=accepted, 1=dismissed
  created_at DATETIME
);
```

## API Authentication

### Client Headers
```bash
# Device token
Authorization: Bearer <device_token>

# Or
X-Device-Token: <device_token>
```

### Admin Headers
```bash
Authorization: Bearer <admin_token>
```

## Migration

Run migration to upgrade schema:

```bash
cd server
node migrations/001_harden_personalization.js
```

## Testing

Run automated tests:

```bash
cd server
node tests/personalization.test.js
```

Tests verify:
- ✓ Cross-user access isolation
- ✓ Reset deletes all data
- ✓ Preference inference with confidence
- ✓ Throttling prevents spam
- ✓ Confidence filtering
- ✓ Deduplication

## Monitoring

### Key Metrics
- Actions logged per user per day
- Preference confidence distribution
- Suggestion acceptance/dismissal rates
- Throttling trigger frequency
- Cleanup deleted row counts

### Queries

```sql
-- User action count
SELECT user_id, COUNT(*) as count 
FROM user_actions_new 
GROUP BY user_id;

-- Preference confidence distribution
SELECT 
  ROUND(confidence, 1) as conf_bucket,
  COUNT(*) as count
FROM user_preferences
GROUP BY conf_bucket;

-- Suggestion dismissal rates
SELECT 
  suggestion_type,
  SUM(dismissed) * 1.0 / COUNT(*) as dismissal_rate
FROM suggestion_history
GROUP BY suggestion_type;

-- Old actions to cleanup
SELECT COUNT(*) 
FROM user_actions_new 
WHERE created_at < datetime('now', '-90 days');
```

## Scheduled Jobs

### Daily Cleanup (Recommended)
```bash
# Cron: 2am daily
0 2 * * * curl -X POST http://localhost:3001/api/personalization/admin/cleanup \
  -H "Authorization: Bearer <admin_token>"
```

## Tuning Recommendations

### High-Traffic System
- Increase `PREF_CONFIDENCE_THRESHOLD` to 0.8
- Decrease `ACTION_RETENTION_DAYS` to 30
- Increase cooldowns (traffic: 8h, weather: 24h)

### Low-Traffic System
- Decrease `PREF_CONFIDENCE_THRESHOLD` to 0.6
- Keep `ACTION_RETENTION_DAYS` at 90
- Keep default cooldowns

### Privacy-Focused
- Decrease `ACTION_RETENTION_DAYS` to 30
- Increase all cooldowns by 2x
- Decrease `MAX_SUGGESTIONS_PER_DAY` to 1

## Compliance

### GDPR
- ✓ Right to access: `GET /api/personalization/transparency`
- ✓ Right to deletion: `POST /api/personalization/reset`
- ✓ Data portability: Export via transparency endpoint
- ✓ Purpose limitation: Only use data for stated purposes

### CCPA
- ✓ Right to know: Transparency endpoint
- ✓ Right to delete: Reset endpoint
- ✓ Right to opt-out: Reset + disable personalization

## Troubleshooting

### No preferences being learned
- Check `PREF_CONFIDENCE_THRESHOLD` - may be too high
- Verify actions have `confidence >= threshold`
- Check `status = 'success'` in logged actions

### Too many suggestions
- Verify throttling is working
- Check `MAX_SUGGESTIONS_PER_DAY` setting
- Review cooldown periods

### Duplicate actions
- Verify dedupe_hash is being generated
- Check 10-second window is sufficient
- Review action logging code

### Cross-user data leakage
- Verify `requireAuth` middleware is applied
- Check all routes use `req.user.id` not `req.params.userId`
- Run cross-user access test
