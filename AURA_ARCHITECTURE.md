# Aura Executor Architecture

## Overview

Aura is a unified task execution system adapted from OpenClaw's gateway/control-plane pattern. It provides a single pipeline for both message and voice inputs, with strict security controls and tool allowlisting.

## Core Concepts (from OpenClaw)

### 1. Gateway Pattern
- **Single Entry Point**: All commands (message/voice) flow through `runAuraCommand()`
- **Session Management**: Minimal session tracking for conversation continuity
- **Tool Registry**: Allowlist-based tool execution with validation

### 2. Execution Flow

```
Input (Message/Voice)
    ↓
Normalize & Sanitize
    ↓
Load/Create Session
    ↓
Analyze Intent
    ↓
├─ Direct Reply → Return
└─ Tool Call
    ↓
Validate Tool (Allowlist)
    ↓
Execute via Local Agent
    ↓
Format Reply
    ↓
Return { replyText, toolTrace, actionsTaken }
```

### 3. Security Model

**Tool Allowlist**: Only pre-approved tools can execute
- `open_app`, `open_url`, `open_url_id`
- `search_files`
- `get_system_info`, `list_processes`

**Permission Checks**: Tools specify allowed sources (message/voice)

**Input Sanitization**: Max 2000 chars, trimmed

**Timeout Enforcement**: Each tool has a timeout (5-10s)

**Audit Logging**: All executions logged via local agent

## Architecture Differences from OpenClaw

| OpenClaw | Aura (Chottu) |
|----------|---------------|
| WebSocket gateway | HTTP REST endpoints |
| Complex session store | In-memory Map |
| Skills marketplace | Fixed tool allowlist |
| Multi-node routing | Single local agent |
| Full LLM integration | Simple pattern matching (for now) |

## File Structure

```
server/
├── aura/
│   ├── executor.js         # Core execution engine
│   ├── tool-registry.js    # Tool allowlist & validation
│   └── session-manager.js  # Minimal session tracking
├── tests/
│   └── aura.test.js        # Unit tests
└── index.js                # Wired into /api/chat endpoint
```

## Integration Points

### 1. Message Handler (Backend)
```javascript
// server/index.js
app.post('/api/chat', async (req, res) => {
  if (AURA_ENABLED) {
    const result = await runAuraCommand({
      source: 'message',
      userId: req.body.userId,
      sessionId: req.body.sessionId,
      text: req.body.text,
    });
    return res.json({ reply: result.replyText });
  }
  // ... existing logic
});
```

### 2. Voice Handler (Frontend)
```javascript
// App.tsx - After voice transcription
if (AURA_ENABLED) {
  const result = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      source: 'voice',
      text: transcription,
      sessionId: currentSessionId,
    }),
  });
}
```

## Feature Flags

- `AURA_EXECUTOR=true` - Enable Aura execution pipeline
- `AURA_DRY_RUN=true` - Simulate tool execution without running

## Tool Trace Format

Every execution returns a structured trace:

```json
{
  "requestId": "aura_1234567890_abc123",
  "source": "message",
  "userId": "user_123",
  "sessionId": "session_456",
  "input": "open notepad",
  "startTime": 1234567890000,
  "endTime": 1234567891234,
  "duration": 1234,
  "steps": [
    { "step": "normalize", "status": "ok", "timestamp": 1234567890100 },
    { "step": "session_loaded", "sessionId": "session_456", "timestamp": 1234567890200 },
    { "step": "intent_analysis", "intent": "tool_call", "timestamp": 1234567890300 },
    { "step": "tool_validation", "status": "ok", "tool": "open_app", "timestamp": 1234567890400 },
    { "step": "tool_execution", "status": "ok", "tool": "open_app", "result": "Opened notepad", "timestamp": 1234567891200 }
  ]
}
```

## Future Enhancements

1. **LLM Integration**: Replace pattern matching with actual LLM intent analysis
2. **Persistent Sessions**: Store sessions in SQLite instead of memory
3. **Tool Marketplace**: Dynamic tool loading (like OpenClaw skills)
4. **Multi-Agent**: Support multiple specialized agents
5. **Streaming Responses**: Real-time tool execution updates

## Security Considerations

- **Default Deny**: Unknown tools are blocked
- **Source Validation**: Tools specify allowed sources
- **Timeout Protection**: All tools have execution timeouts
- **Input Limits**: Max 2000 chars per input
- **Audit Trail**: All executions logged by local agent
- **Token Isolation**: Agent token never leaves backend

## Testing

See `server/tests/aura.test.js` for comprehensive test suite covering:
- Tool allowlist validation
- Unified message/voice pipeline
- Input sanitization
- Dry run mode
