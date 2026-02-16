# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Run Migrations
```bash
npm run migrate
```

### 2. Run Tests
```bash
npm test
```

### 3. Configure Environment Variables

**Required:**
```bash
# server/.env
PREF_CONFIDENCE_THRESHOLD=0.7
ACTION_RETENTION_DAYS=90
```

**Security (Production):**
```bash
# Admin access control
ENABLE_ADMIN_ROUTES=false              # Disable admin routes in production
ADMIN_TOKENS=hashed_token_1,hashed_token_2  # Use strong random tokens
ADMIN_IP_ALLOWLIST=10.0.0.1,10.0.0.2   # Restrict admin access by IP

# Rate limiting (defaults: 60 req/min)
# Adjust in middleware/requireAuth.js if needed
```

**Generate Admin Token:**
```bash
# Generate secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Hash it for storage (SHA256)
node -e "const t='YOUR_TOKEN'; console.log(require('crypto').createHash('sha256').update(t).digest('hex'))"
```

## Security Hardening

### 1. Users & Devices

**Multi-device support:**
- One user can have multiple devices
- All devices share same user profile and preferences
- Device tokens map to user_id via `devices.user_id` FK

**Device tracking:**
- `last_seen_at` updated on every auth
- Monitor inactive devices
- Revoke compromised tokens: `UPDATE devices SET revoked = 1 WHERE token = ?`

### 2. Rate Limiting

**Per-token limits:**
- 60 requests per minute per device token
- Prevents abuse from single device

**Per-IP limits:**
- 60 requests per minute per IP address
- Prevents distributed abuse

**Response:**
- HTTP 429 when limit exceeded
- Client should implement exponential backoff

### 3. Request Body Size

**Limit:** 100KB per request
**Response:** HTTP 413 if exceeded
**Prevents:** Memory exhaustion attacks

### 4. Safe JSON Parsing

**Entities validation:**
- Max 10KB per entities_json field
- Circular references caught
- Invalid JSON caught
- Stored as `{"error": "..."}` on failure

### 5. Admin Endpoint Security

**Production mode:**
```bash
ENABLE_ADMIN_ROUTES=false  # Completely disable admin routes
```

**If admin routes needed:**
```bash
ENABLE_ADMIN_ROUTES=true
ADMIN_TOKENS=<SHA256_hash_of_token>
ADMIN_IP_ALLOWLIST=<comma_separated_IPs>
```

**Token security:**
- Never log admin tokens
- Use SHA256 hashes in env vars
- Rotate tokens regularly
- Use strong random tokens (32+ bytes)

**IP allowlist:**
- Restrict to known admin IPs
- Use VPN or bastion host
- Monitor failed admin attempts

### 6. Logging Security

**Never log:**
- Device tokens
- Admin tokens
- User passwords
- PII (email, phone, etc.)

**Safe logging:**
```javascript
// BAD
console.log('Auth token:', token);

// GOOD
console.log('Auth attempt from IP:', req.ip);
```

## Explainability Integrity

### Evidence Metadata

Every suggestion includes evidence:
```json
{
  "type": "route_reminder",
  "message": "Plan your trip from DC to NYC?",
  "evidence": {
    "source": "inferred",
    "signals": ["frequent_route"],
    "confidence": 0.85,
    "count": 12,
    "route": "DC-NYC"
  }
}
```

### Transparency Endpoint

`GET /api/personalization/transparency` returns:
```json
{
  "evidenceDetails": [
    {
      "type": "frequent_route",
      "value": "DC-NYC",
      "confidence": 0.85,
      "evidenceCount": 12,
      "usedFor": "Route suggestions and traffic alerts"
    }
  ]
}
```

**Rules:**
- Only reference stored evidence
- Include confidence scores
- Show evidence count
- Explain how data is used

## Monitoring

### Key Metrics

**Rate limiting:**
```sql
-- Check rate limit hits (implement logging)
SELECT COUNT(*) FROM rate_limit_logs WHERE status = 'blocked';
```

**Device activity:**
```sql
-- Inactive devices (>30 days)
SELECT token, device_name, last_seen_at 
FROM devices 
WHERE last_seen_at < datetime('now', '-30 days');

-- Active users
SELECT COUNT(DISTINCT user_id) FROM devices WHERE last_seen_at > datetime('now', '-7 days');
```

**Multi-device users:**
```sql
-- Users with multiple devices
SELECT user_id, COUNT(*) as device_count 
FROM devices 
WHERE revoked = 0 
GROUP BY user_id 
HAVING device_count > 1;
```

**Admin access:**
```sql
-- Monitor admin endpoint usage (implement logging)
SELECT endpoint, ip, timestamp FROM admin_access_logs;
```

### Alerts

Set up alerts for:
- Rate limit exceeded (>100 blocks/hour)
- Failed admin auth attempts
- Unusual device activity
- Large request bodies rejected

## Deployment Steps

### 1. Database Migration
```bash
npm run migrate
```

### 2. Environment Configuration
```bash
# Copy production env
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### 3. Test in Staging
```bash
NODE_ENV=staging npm start
npm test
```

### 4. Deploy to Production
```bash
# Build
npm run build

# Start with production env
NODE_ENV=production npm start
```

### 5. Verify Deployment
```bash
# Health check
curl http://localhost:3001/health

# Test auth (should fail without token)
curl http://localhost:3001/api/personalization/profile
# Expected: 401 Unauthorized

# Test with valid token
curl -H "Authorization: Bearer <device_token>" \
  http://localhost:3001/api/personalization/profile
# Expected: 200 OK with profile data

# Test rate limiting (run 61 times)
for i in {1..61}; do
  curl -H "Authorization: Bearer <token>" \
    http://localhost:3001/api/personalization/profile
done
# Expected: First 60 succeed, 61st returns 429

# Test admin routes disabled
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3001/api/personalization/admin/cleanup
# Expected: 404 Not Found (if ENABLE_ADMIN_ROUTES=false)
```

## Rollback Plan

If issues occur:

1. **Stop service**
```bash
pm2 stop aura-server
```

2. **Restore database backup**
```bash
cp chottu.db.backup chottu.db
```

3. **Revert code**
```bash
git revert <commit_hash>
```

4. **Restart service**
```bash
pm2 start aura-server
```

## Scheduled Jobs

### Daily Cleanup
```bash
# Cron: 2am daily
0 2 * * * cd /path/to/server && npm run cleanup >> /var/log/aura-cleanup.log 2>&1
```

### Weekly Device Cleanup
```bash
# Revoke devices inactive >90 days
0 3 * * 0 node scripts/revoke_inactive_devices.js
```

## Compliance

### GDPR
- ✓ Right to access: `/transparency`
- ✓ Right to deletion: `/reset`
- ✓ Data portability: Export via transparency
- ✓ Purpose limitation: Evidence-based explanations

### CCPA
- ✓ Right to know: Transparency endpoint
- ✓ Right to delete: Reset endpoint
- ✓ Right to opt-out: Reset + disable personalization

## Support

For production issues:
1. Check logs: `tail -f /var/log/aura-server.log`
2. Check database: `sqlite3 chottu.db`
3. Run tests: `npm test`
4. Review monitoring dashboards
5. Contact: ops@example.com
