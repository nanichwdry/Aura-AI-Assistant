# Aura Executor Runbook

## Quick Start

### 1. Enable Aura Executor

Edit `server/.env`:
```bash
AURA_EXECUTOR=true
AURA_DRY_RUN=false
```

Restart backend:
```bash
cd server
npm start
```

### 2. Test Aura

**Dry Run Mode** (safe testing):
```bash
# Edit server/.env
AURA_DRY_RUN=true

# Restart server
cd server
npm start

# Test via API
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text":"open notepad","userId":"test","sessionId":"test123"}'
```

**Live Mode**:
```bash
# Edit server/.env
AURA_DRY_RUN=false

# Restart server and test
```

### 3. Run Tests

```bash
cd server
node tests/aura.test.js
```

Expected output:
```
=== Test Suite 1: Tool Allowlist ===
✓ Allowed tool should pass validation
✓ Unknown tool should fail validation
...

=== Test Summary ===
Passed: 10
Failed: 0
Total: 10

✓ All tests passed!
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AURA_EXECUTOR` | `false` | Enable Aura execution pipeline |
| `AURA_DRY_RUN` | `false` | Simulate tool execution (no actual execution) |
| `CHOTU_AGENT_TOKEN` | (required) | Token for local agent authentication |

### Tool Allowlist

Edit `server/aura/tool-registry.js` to add/remove tools:

```javascript
const ALLOWED_TOOLS = {
  my_new_tool: {
    schema: { arg1: 'string', arg2: 'number' },
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
};
```

## Usage Examples

### Message Input

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "text": "open notepad",
    "userId": "user123",
    "sessionId": "session456"
  }'
```

Response:
```json
{
  "success": true,
  "reply": "Opened notepad.",
  "trace": {
    "requestId": "aura_1234567890_abc123",
    "source": "message",
    "duration": 1234,
    "steps": [...]
  },
  "actions": [
    {
      "tool": "open_app",
      "args": { "app_id": "notepad" },
      "result": { "success": true, "reply": "Opened notepad." }
    }
  ]
}
```

### Voice Input

Voice transcription automatically routes through the same pipeline. No code changes needed.

## Debugging

### Enable Trace Logging

Tool traces are returned with every response. Inspect the `trace` object:

```javascript
{
  "trace": {
    "requestId": "aura_1234567890_abc123",
    "steps": [
      { "step": "normalize", "status": "ok" },
      { "step": "intent_analysis", "intent": "tool_call" },
      { "step": "tool_validation", "status": "ok", "tool": "open_app" },
      { "step": "tool_execution", "status": "ok", "result": "Opened notepad" }
    ]
  }
}
```

### Common Issues

**Issue**: "Tool not in allowlist"
- **Cause**: Tool name not in `ALLOWED_TOOLS`
- **Fix**: Add tool to `server/aura/tool-registry.js`

**Issue**: "Local agent isn't responding"
- **Cause**: Local agent not running or wrong token
- **Fix**: 
  1. Start local agent: `node server/services/local-agent.js`
  2. Verify `CHOTU_AGENT_TOKEN` matches in both `.env` files

**Issue**: "Timeout"
- **Cause**: Tool execution exceeded timeout
- **Fix**: Increase timeout in tool registry or check agent performance

**Issue**: "Invalid argument"
- **Cause**: Tool args don't match schema
- **Fix**: Check tool schema in `tool-registry.js`

### Check Agent Health

```bash
curl http://127.0.0.1:8787/health
```

Expected:
```json
{
  "ok": true,
  "service": "local-agent",
  "platform": "win32"
}
```

### View Audit Logs

Local agent logs all executions:
```bash
type server\local-agent-audit.log
```

## Monitoring

### Session Cleanup

Sessions auto-cleanup after 1 hour of inactivity. Manual cleanup:

```javascript
// In Node REPL or script
import { clearOldSessions } from './server/aura/session-manager.js';
clearOldSessions(3600000); // 1 hour
```

### Performance Metrics

Track via tool traces:
- `duration`: Total execution time
- `steps[].timestamp`: Individual step timing

## Rollback

To disable Aura and revert to original behavior:

```bash
# Edit server/.env
AURA_EXECUTOR=false

# Restart server
cd server
npm start
```

All existing functionality remains unchanged.

## Testing Checklist

Before deploying:

- [ ] Run unit tests: `node server/tests/aura.test.js`
- [ ] Test dry run mode
- [ ] Test message input
- [ ] Test voice input
- [ ] Verify tool allowlist blocks unknown tools
- [ ] Check audit logs
- [ ] Test timeout handling
- [ ] Verify session cleanup

## Support

For issues:
1. Check tool trace in response
2. Review audit logs: `server/local-agent-audit.log`
3. Test with `AURA_DRY_RUN=true`
4. Run unit tests
5. Verify local agent is running

## Advanced: Adding New Tools

1. **Define tool in registry**:
```javascript
// server/aura/tool-registry.js
const ALLOWED_TOOLS = {
  my_tool: {
    schema: { param1: 'string' },
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
};
```

2. **Implement in local agent**:
```javascript
// server/services/local-agent.js
case "my_tool": {
  const param = args?.param1;
  // ... implementation
  result = "Tool executed";
  break;
}
```

3. **Add intent pattern** (optional):
```javascript
// server/aura/executor.js - analyzeIntent()
if (lower.includes('my command')) {
  return {
    type: 'tool_call',
    toolName: 'my_tool',
    args: { param1: 'value' },
  };
}
```

4. **Test**:
```bash
node server/tests/aura.test.js
```
