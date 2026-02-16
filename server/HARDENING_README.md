# Hardened Personalization System

Production-grade long-term personalization with security, privacy, and quality controls.

## Quick Start

### 1. Run Migrations
```bash
cd server
npm run migrate  # Runs both 001 and 002 migrations
```

### 2. Configure Environment
Add to `server/.env`:
```bash
PREF_CONFIDENCE_THRESHOLD=0.7
ACTION_RETENTION_DAYS=90

# Production security
ENABLE_ADMIN_ROUTES=false
ADMIN_TOKENS=<sha256_hash>
ADMIN_IP_ALLOWLIST=10.0.0.1,10.0.0.2
```

### 3. Run Tests
```bash
npm test  # Runs personalization + production blocker tests
```

### 4. Start Server
```bash
npm start
```

## Production Blockers Resolved ✅

### 1. Real Users (Not Device Tokens)
- ✅ Added `users` table
- ✅ Added `devices.user_id` FK
- ✅ Auth middleware maps token → user_id
- ✅ Multiple devices share one user
- ✅ Device `last_seen_at` tracking

### 2. Abuse Controls
- ✅ Rate limiting: 60 req/min per token + per IP
- ✅ Request body size limit: 100KB
- ✅ Safe JSON parsing with size limits
- ✅ HTTP 429 on rate limit exceeded
- ✅ HTTP 413 on body too large

### 3. Secure Admin Endpoints
- ✅ `ENABLE_ADMIN_ROUTES` flag (default: false)
- ✅ SHA256 hashed admin tokens
- ✅ IP allowlist for admin access
- ✅ Tokens never logged
- ✅ `requireAdmin` middleware

### 4. Explainability Integrity
- ✅ Evidence metadata in all suggestions
- ✅ `evidence.source`, `evidence.signals`, `evidence.count`
- ✅ Transparency endpoint shows evidence details
- ✅ Only references stored evidence

## Security Model

### Authentication Required
All personalization endpoints require authentication via device token:

```bash
# Client request
curl -H "Authorization: Bearer <device_token>" \
  http://localhost:3001/api/personalization/profile
```

### User Isolation
- User ID derived from auth token (NOT URL parameter)
- Cross-user access automatically denied
- Admin-only endpoints for cross-user operations

### Admin Access
```bash
# Admin endpoints require admin token
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3001/api/personalization/admin/cleanup
```

## Data Quality

### Confidence Filtering
- Only actions with `confidence >= 0.7` used for learning
- Failed/canceled actions ignored
- Partial voice transcripts skipped

### Deduplication
- Identical actions within 10 seconds deduplicated
- Hash-based: `MD5(userId:eventType:entities)`

### Learning Filter
```javascript
// Only high-quality data used
logAction(userId, 'route_search', {
  entities: { origin: 'DC', destination: 'NYC' },
  status: 'success',      // must be 'success'
  confidence: 0.9,        // must be >= 0.7
  source: 'text',         // 'text', 'voice', 'ui'
  partial: false          // voice: skip partial transcripts
});
```

## Preference Confidence Model

Preferences stored with evidence:

```json
{
  "key": "frequent_route",
  "value": "DC-NYC",
  "confidence": 0.85,
  "evidence": {
    "count": 12,
    "lastSeen": "2024-01-15T10:30:00Z",
    "windowDays": 90
  }
}
```

### Confidence Thresholds
- **Route suggestions**: 0.6 minimum
- **Budget recommendations**: 0.6 minimum
- **Personalization applied**: Only when confidence >= threshold

## Proactive Throttling

### Daily Limits
- Max 3 suggestions per day per user
- Prevents notification fatigue

### Category Cooldowns
- **Traffic alerts**: 4 hours
- **Weather updates**: 12 hours
- **Price drops**: 24 hours
- **Route reminders**: 24 hours

### Dismissal Tracking
- If user dismisses >50% of category, stop suggesting
- Relevance score adjusted: `score * (1 - dismissalRate)`

## Retention Policy

### Automatic Cleanup
- Raw actions deleted after 90 days (configurable)
- Aggregated preferences retained indefinitely
- Run cleanup: `npm run cleanup`

### Scheduled Cleanup (Recommended)
```bash
# Cron: 2am daily
0 2 * * * cd /path/to/server && npm run cleanup
```

## API Endpoints

### User Endpoints (Authenticated)
```bash
GET    /api/personalization/profile
POST   /api/personalization/profile
GET    /api/personalization/actions
GET    /api/personalization/preferences
GET    /api/personalization/suggestions
POST   /api/personalization/suggestions/:type/dismiss
POST   /api/personalization/suggestions/:type/accept
GET    /api/personalization/daily
POST   /api/personalization/reset
GET    /api/personalization/transparency
```

### Admin Endpoints
```bash
GET    /api/personalization/admin/profile/:userId
POST   /api/personalization/admin/cleanup
```

## Testing

### Run All Tests
```bash
npm test
```

### Tests Included
- ✓ Cross-user access isolation
- ✓ Reset deletes all data
- ✓ Preference inference with confidence
- ✓ Throttling prevents spam
- ✓ Confidence filtering
- ✓ Deduplication

## Configuration

See [HARDENING_CONFIG.md](./agent/HARDENING_CONFIG.md) for:
- Environment variables
- Threshold tuning
- Security settings
- Monitoring queries
- Compliance (GDPR/CCPA)

## Migration from Old System

Old system used:
- URL-based userId (insecure)
- No confidence model
- No throttling
- No deduplication
- No retention policy

New system:
- Token-based auth
- Confidence-based learning
- Throttled suggestions
- Deduplicated actions
- Automatic cleanup

### Migration Steps
1. Run `npm run migrate` to create new tables
2. Update client to send auth tokens
3. Old data in `user_actions` table (not migrated)
4. New data in `user_actions_new` table

## Monitoring

### Key Metrics
```sql
-- Actions per user
SELECT user_id, COUNT(*) FROM user_actions_new GROUP BY user_id;

-- Confidence distribution
SELECT ROUND(confidence, 1), COUNT(*) FROM user_preferences GROUP BY 1;

-- Dismissal rates
SELECT suggestion_type, AVG(dismissed) FROM suggestion_history GROUP BY 1;
```

## Troubleshooting

### No preferences learned
- Check `PREF_CONFIDENCE_THRESHOLD` (may be too high)
- Verify actions have `status='success'` and `confidence>=0.7`

### Too many suggestions
- Check `MAX_SUGGESTIONS_PER_DAY` in `proactive_engine.js`
- Verify cooldowns are working

### Duplicate actions
- Check dedupe_hash generation
- Verify 10-second window

## Compliance

### GDPR
- ✓ Right to access: `/transparency` endpoint
- ✓ Right to deletion: `/reset` endpoint
- ✓ Data portability: Export via transparency
- ✓ Purpose limitation: Only stated purposes

### CCPA
- ✓ Right to know: Transparency endpoint
- ✓ Right to delete: Reset endpoint
- ✓ Right to opt-out: Reset + disable

## Architecture

```
Client Request
    ↓ (with auth token)
requireAuth Middleware
    ↓ (derives userId)
Personalization Routes
    ↓
Preference Engine
    ↓ (confidence filtering)
Database (user_actions_new, user_preferences)
    ↓
Proactive Engine
    ↓ (throttling)
Suggestions
```

## Files

- `migrations/001_harden_personalization.js` - Database migration
- `middleware/requireAuth.js` - Auth middleware
- `agent/preference_engine.js` - Learning engine
- `agent/proactive_engine.js` - Suggestion engine
- `routes/personalization.js` - API routes
- `tests/personalization.test.js` - Automated tests
- `cleanup.js` - Scheduled cleanup script
- `agent/HARDENING_CONFIG.md` - Configuration guide

## Support

For issues:
1. Check configuration in `.env`
2. Run tests: `npm test`
3. Review logs for errors
4. Check [HARDENING_CONFIG.md](./agent/HARDENING_CONFIG.md)
