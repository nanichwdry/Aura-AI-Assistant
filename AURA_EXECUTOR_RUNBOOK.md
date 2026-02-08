AURA EXECUTOR RUNBOOK
=====================

Environment Variables
---------------------

Required:
  CHOTU_AGENT_TOKEN=<your-token>          # Token for local agent authentication

Feature Flags:
  AURA_EXECUTOR=true|false                # Master switch (default: false)
  AURA_DRY_RUN=true|false                 # Simulate tools without executing (default: false)
  AURA_BROWSER_AUTOMATION=true|false      # Enable browser control (default: false)
  AURA_BROWSER_SCROLL=true|false          # Enable scroll specifically (default: false)
  AURA_LINKEDIN_N8N=true|false            # Enable LinkedIn posting (default: false)

Optional (for LinkedIn posting):
  N8N_LINKEDIN_WEBHOOK_URL=<webhook-url>  # n8n webhook for LinkedIn posts
  N8N_WEBHOOK_AUTH_TOKEN=<token>          # Bearer token for webhook auth

How to Enable Flags
-------------------

1. Edit server/.env file:
   ```
   AURA_EXECUTOR=true
   AURA_BROWSER_SCROLL=true
   AURA_LINKEDIN_N8N=true
   ```

2. Restart backend server:
   ```
   cd server
   npm start
   ```

3. Verify in logs:
   - Server should start without errors
   - Check server/aura-audit.log for execution traces

How to Run Tests
----------------

1. Run Aura executor tests:
   ```
   cd server
   node tests/aura.test.js
   ```

2. Run browser scroll tests:
   ```
   node tests/browser-scroll.test.js
   ```

3. Expected output:
   ```
   === Aura Executor Tests ===
   Test 1: Tool allowlist blocks unknown tools
   ✓ Unknown tool blocked
   ✓ Known tool allowed
   ...
   ✓ All tests passed!
   ```

How to Debug Traces
-------------------

1. Enable executor:
   ```
   AURA_EXECUTOR=true
   ```

2. Send test command:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"text":"open notepad","sessionId":"test123"}'
   ```

3. Check audit log:
   ```
   cat server/aura-audit.log
   ```

4. Trace format:
   ```json
   {
     "requestId": "aura_1234567890_abc123",
     "source": "message",
     "userId": "default",
     "sessionId": "test123",
     "input": "open notepad",
     "steps": [
       {"step":"normalize","status":"ok","timestamp":1234567890},
       {"step":"session_loaded","sessionId":"test123","timestamp":1234567891},
       {"step":"intent_analysis","intent":"tool_call","timestamp":1234567892},
       {"step":"tool_validation","status":"ok","tool":"open_app","timestamp":1234567893},
       {"step":"tool_execution","status":"ok","tool":"open_app","result":"Opened notepad","timestamp":1234567894}
     ],
     "duration": 234
   }
   ```

Testing Browser Scroll
-----------------------

1. Enable browser automation:
   ```
   AURA_EXECUTOR=true
   AURA_BROWSER_SCROLL=true
   ```

2. Open a webpage (e.g., Chrome with a long page)

3. Send scroll command:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"text":"scroll down","sessionId":"test123"}'
   ```

4. Expected response:
   ```json
   {
     "success": true,
     "reply": "Scrolled down.",
     "trace": {...},
     "actions": [{"tool":"browser_scroll","args":{"direction":"down"},"result":{...}}]
   }
   ```

5. If no page open:
   ```json
   {
     "success": true,
     "reply": "No page is open right now.",
     ...
   }
   ```

Testing LinkedIn Posting
-------------------------

1. Configure n8n webhook:
   ```
   N8N_LINKEDIN_WEBHOOK_URL=https://your-n8n.com/webhook/linkedin-post
   N8N_WEBHOOK_AUTH_TOKEN=your-secret-token
   AURA_LINKEDIN_N8N=true
   ```

2. Prepare post:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"text":"post on linkedin: Hello world!","sessionId":"test123"}'
   ```

3. Expected response:
   ```json
   {
     "success": true,
     "reply": "Ready to post on LinkedIn:\n\n\"Hello world!\"\n\nSay \"confirm post\" to publish, or \"cancel\" to discard.",
     ...
   }
   ```

4. Confirm post:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"text":"confirm post","sessionId":"test123"}'
   ```

5. Expected response:
   ```json
   {
     "success": true,
     "reply": "Posted to LinkedIn!",
     ...
   }
   ```

6. Or cancel:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3001/api/chat" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"text":"cancel","sessionId":"test123"}'
   ```

Dry Run Mode
------------

Test without executing:
```
AURA_DRY_RUN=true
```

All tools will return:
```json
{
  "success": true,
  "reply": "[DRY RUN] Would execute: open_app with {\"app_id\":\"notepad\"}",
  "dryRun": true
}
```

Troubleshooting
---------------

Problem: "Tool not in allowlist"
Solution: Check tool-registry.js - only registered tools can execute

Problem: "Feature not enabled"
Solution: Enable required feature flag in .env

Problem: "No page is open right now"
Solution: Open a browser page before scrolling

Problem: "LinkedIn webhook not configured"
Solution: Set N8N_LINKEDIN_WEBHOOK_URL and N8N_WEBHOOK_AUTH_TOKEN

Problem: "That draft expired"
Solution: Confirm within 5 minutes of preparing post

Problem: "Local agent isn't responding"
Solution: Start local agent: node server/services/local-agent.js

Monitoring
----------

1. Audit log location:
   server/aura-audit.log

2. Log format:
   JSON lines (one trace per line)

3. View recent traces:
   ```
   tail -f server/aura-audit.log | jq
   ```

4. Count executions:
   ```
   wc -l server/aura-audit.log
   ```

5. Find errors:
   ```
   grep '"status":"error"' server/aura-audit.log | jq
   ```

Safety Checks
-------------

✓ Default deny - only allowlisted tools execute
✓ Schema validation - args must match expected types
✓ Feature flags - tools can require specific flags
✓ Timeouts - all tools have max execution time
✓ Confirmations - destructive actions require two steps
✓ Audit logs - every execution logged
✓ No arbitrary code - only fixed JS templates
✓ Clamping - numeric values bounded to safe ranges

Voice Integration
-----------------

When AURA_EXECUTOR=true, voice transcripts automatically route through executor.

Voice commands work identically to text:
- "open notepad" → opens notepad
- "scroll down" → scrolls page
- "post on linkedin: my update" → prepares post
- "confirm post" → publishes post
- "cancel" → cancels pending action

No code changes needed in frontend - executor handles both sources uniformly.
