# Aura Executor - Deployment Checklist

## Pre-Deployment

### Code Review
- [x] All new files created
- [x] All modifications applied
- [x] No breaking changes to existing code
- [x] Feature flags implemented
- [x] Tests written and passing

### Testing
- [x] Unit tests pass (15/15)
- [x] Tool allowlist validation works
- [x] Message/voice unified pipeline verified
- [x] Input sanitization tested
- [x] Dry run mode tested
- [x] Error handling verified

### Documentation
- [x] Architecture document created
- [x] Operations runbook created
- [x] Implementation summary created
- [x] Delivery summary created
- [x] README updated

## Deployment Steps

### 1. Backup Current System
```bash
# Backup database
copy server\chottu.db server\chottu.db.backup

# Backup .env
copy server\.env server\.env.backup
```

### 2. Deploy Code
```bash
# Pull latest code (or copy files)
git pull origin main

# Install dependencies (if any new ones)
cd server
npm install
```

### 3. Configure Environment
```bash
# Edit server/.env
AURA_EXECUTOR=false  # Start disabled
AURA_DRY_RUN=true    # Enable dry run first
```

### 4. Start Services
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server
npm start

# Terminal 3: Local Agent
cd server
node services/local-agent.js
```

### 5. Verify Health
```bash
# Check backend
curl http://localhost:3001/api/health

# Check local agent
curl http://127.0.0.1:8787/health

# Check frontend
# Open http://localhost:5173
```

### 6. Test Dry Run Mode
```bash
# Enable Aura in dry run
# Edit server/.env:
AURA_EXECUTOR=true
AURA_DRY_RUN=true

# Restart backend
# Test via API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"open notepad","userId":"test","sessionId":"test123"}'

# Expected: Reply with "[DRY RUN]" prefix
```

### 7. Run Unit Tests
```bash
cd server
node tests/aura.test.js

# Expected: All tests pass (15/15)
```

### 8. Enable Live Mode
```bash
# Edit server/.env:
AURA_EXECUTOR=true
AURA_DRY_RUN=false

# Restart backend
```

### 9. Test Live Execution
```bash
# Test PC control
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"open notepad","userId":"test","sessionId":"test123"}'

# Verify: Notepad should actually open
```

### 10. Monitor Logs
```bash
# Check audit logs
type server\local-agent-audit.log

# Look for successful executions
```

## Post-Deployment

### Verification Checklist
- [ ] Aura executor enabled
- [ ] Message input works
- [ ] Voice input works (if integrated)
- [ ] Tool allowlist blocks unknown tools
- [ ] Audit logs being written
- [ ] No errors in console
- [ ] UI shows "Aura" branding
- [ ] Original functionality still works

### Monitoring
- [ ] Check tool execution times (should be < 5s)
- [ ] Monitor session count (cleanup after 1 hour)
- [ ] Review audit logs daily
- [ ] Check for failed tool executions

### Rollback Plan
If issues occur:
```bash
# Edit server/.env
AURA_EXECUTOR=false

# Restart backend
cd server
npm start

# Verify original functionality restored
```

## Troubleshooting

### Issue: "Tool not in allowlist"
**Solution**: Add tool to `server/aura/tool-registry.js`

### Issue: "Local agent isn't responding"
**Solution**: 
1. Check agent is running: `curl http://127.0.0.1:8787/health`
2. Verify token matches in both `.env` files
3. Check firewall isn't blocking port 8787

### Issue: "Timeout"
**Solution**: Increase timeout in tool registry or check agent performance

### Issue: Tests failing
**Solution**: 
1. Ensure local agent is NOT running during tests
2. Check `AURA_DRY_RUN=true` is set
3. Review test output for specific failures

## Success Criteria

- [x] All tests pass
- [ ] Aura executor enabled in production
- [ ] Message input working
- [ ] Voice input working
- [ ] Tool executions logged
- [ ] No breaking changes
- [ ] UI shows "Aura" branding
- [ ] Documentation complete

## Sign-Off

- [ ] Developer tested
- [ ] Code reviewed
- [ ] Documentation reviewed
- [ ] Deployment tested
- [ ] Rollback plan verified
- [ ] Monitoring configured

**Deployment Date**: _____________

**Deployed By**: _____________

**Verified By**: _____________

## Notes

_Add any deployment-specific notes here_
