# Aura Agent Core

Agent-Orchestrated system with multi-step autonomous planning and tool chaining.

## Architecture

```
User Message → Planner → Execution Loop → Tool Chain → Session Memory → Structured Response
```

## Components

### 1. Intent Parser (`intent_parser.js`)
- Uses GPT-4o-mini to classify user messages
- Returns: `{ intent, entities, requiredTools, confidence }`
- Detects: route_planner, code_analyzer, weather, news, etc.

### 2. Tool Registry (`tool_registry.js`)
- Central registry of all available tools
- Each tool is a function: `async toolName(input) => result`
- Agent calls tools via: `await tools[toolName](input)`

### 3. Planner Engine (`planner.js`) **NEW**
- Breaks complex requests into steps (max 5)
- Identifies missing information
- Generates clarification questions
- Returns execution plan with tool dependencies

### 4. Execution Loop (`agent_loop.js`) **NEW**
- Executes multi-step plans sequentially
- Validates intermediate outputs
- Handles failures with fallback logic
- Synthesizes final recommendation from all results

### 5. Agent Core (`agent_core.js`)
- Main orchestrator with multi-step support
- Flow: Plan → Clarify → Execute → Store → Return
- Retry logic: 2 attempts with 500ms delay
- Returns structured response schema

### 6. Session Memory (`session_memory.js`)
- Stores: lastIntent, lastEntities, lastToolResults, contextStack
- Persists for session duration
- Max 10 items in context stack

## Multi-Step Planning

### Example: Complex Request
**Input:** "Plan a weekend trip from DC to NYC under $800"

**Plan Generated:**
```json
{
  "goal": "Plan affordable DC to NYC weekend trip",
  "needsClarification": false,
  "steps": [
    {"step": 1, "tool": "route_planner", "purpose": "calculate transport cost", "input": {"origin": "DC", "destination": "NYC"}},
    {"step": 2, "tool": "deal_finder", "purpose": "find hotel deals", "input": {"query": "NYC hotels", "budget": 400}},
    {"step": 3, "tool": "weather", "purpose": "check weekend weather", "input": {"city": "NYC"}}
  ]
}
```

**Execution:**
1. Route planner calculates drive time and gas cost
2. Deal finder searches for hotels under budget
3. Weather tool checks forecast
4. Results synthesized into final recommendation

## Response Schema

### Single-Step Response
```json
{
  "success": true,
  "type": "information",
  "goal": "Get NYC weather",
  "stepsExecuted": [{"step": 1, "status": "success", "tool": "weather"}],
  "finalRecommendation": {"summary": "NYC weather: 22°C, clear sky", "confidence": 0.95},
  "reasoningSummary": "Goal: Get NYC weather. Executed 1/1 steps successfully.",
  "confidence": 0.95
}
```

### Multi-Step Response
```json
{
  "success": true,
  "type": "multi_step",
  "goal": "Plan affordable DC to NYC weekend trip",
  "stepsExecuted": [
    {"step": 1, "status": "success", "tool": "route_planner"},
    {"step": 2, "status": "success", "tool": "deal_finder"},
    {"step": 3, "status": "success", "tool": "weather"}
  ],
  "finalRecommendation": {
    "summary": "Trip plan: Drive 4h ($50 gas), stay at Budget Hotel ($300/2 nights), weather: sunny 25°C. Total: ~$350.",
    "confidence": 0.85
  },
  "reasoningSummary": "Goal: Plan affordable DC to NYC weekend trip. Executed 3/3 steps successfully.",
  "confidence": 0.85
}
```

### Clarification Response
```json
{
  "success": true,
  "type": "clarification",
  "reasoning": "Need more information to proceed",
  "data": {"question": "What is your departure city?"},
  "confidence": 0.5
}
```

## Autonomy Features

### Multi-Step Planning
- Automatically breaks complex requests into steps
- Max 5 steps per plan
- Each step has: tool, purpose, input

### Tool Chaining
- Sequential execution of multiple tools
- Results from step N available to step N+1
- Intermediate validation between steps

### Clarification Logic
- Detects missing critical information
- Asks ONE concise question
- Does not proceed blindly

### Failure Handling
- Validates each step output
- Attempts fallback on failure
- Continues execution if possible
- Returns partial results with explanation

### Dynamic Adjustment
- Synthesizes results using GPT-4o-mini
- Explains tradeoffs in recommendations
- Provides full reasoning chain summary
- Calculates confidence scores

## Usage

### API Endpoint
```bash
POST /api/chat
{
  "text": "Plan a weekend trip from DC to NYC under $800",
  "sessionId": "user123"
}
```

### Single-Step Response
```json
{
  "success": true,
  "type": "information",
  "goal": "Get NYC weather",
  "stepsExecuted": [{"step": 1, "status": "success", "tool": "weather"}],
  "finalRecommendation": {"summary": "NYC weather: 22°C, clear sky", "confidence": 0.95},
  "reasoningSummary": "Goal: Get NYC weather. Executed 1/1 steps successfully. NYC weather: 22°C, clear sky",
  "confidence": 0.95
}
```

### Multi-Step Response
```json
{
  "success": true,
  "type": "multi_step",
  "goal": "Plan affordable DC to NYC weekend trip",
  "stepsExecuted": [
    {"step": 1, "status": "success", "tool": "route_planner"},
    {"step": 2, "status": "success", "tool": "deal_finder"},
    {"step": 3, "status": "success", "tool": "weather"}
  ],
  "finalRecommendation": {
    "summary": "Trip plan: Drive 4h ($50 gas), stay at Budget Hotel ($300/2 nights), weather: sunny 25°C. Total: ~$350.",
    "confidence": 0.85
  },
  "reasoningSummary": "Goal: Plan affordable DC to NYC weekend trip. Executed 3/3 steps successfully. Trip plan complete.",
  "confidence": 0.85
}
```

### Clarification Response
```json
{
  "success": true,
  "type": "clarification",
  "reasoning": "Need more information to proceed",
  "data": {"question": "What is your departure city?"},
  "confidence": 0.5
}
```

## Available Tools

- `route_planner` - Google Maps directions with cost estimation
- `code_analyzer` - Code analysis with GPT-4o-mini
- `code_editor` - Code generation and improvement
- `weather` - OpenWeather API with forecasts
- `news` - NewsAPI with category and search
- `wikipedia` - Wikipedia summaries and articles
- `translator` - Multi-language translation
- `games` - RAWG game database search
- `music` - Music player integration
- `notepad` - Note management with AI assistance
- `sketchpad` - Drawing tool with AI generation
- `deal_finder` - Product and service deal search
- `maps` - Location and mapping services
- `internet_agent` - Web search and scraping

## Planning Examples

### Example 1: Research Task
**Input:** "Tell me about quantum computing and find recent news"

**Plan:**
```json
{
  "goal": "Research quantum computing with recent news",
  "steps": [
    {"step": 1, "tool": "wikipedia", "purpose": "get overview"},
    {"step": 2, "tool": "news", "purpose": "find recent articles"}
  ]
}
```

### Example 2: Code Improvement
**Input:** "Analyze this code and suggest improvements: function add(a,b){return a+b}"

**Plan:**
```json
{
  "goal": "Analyze code and provide improvements",
  "steps": [
    {"step": 1, "tool": "code_analyzer", "purpose": "analyze code quality"},
    {"step": 2, "tool": "code_editor", "purpose": "generate improved version"}
  ]
}
```

### Example 3: Trip Planning
**Input:** "Plan a weekend trip from DC to NYC under $800"

**Plan:**
```json
{
  "goal": "Plan affordable DC to NYC weekend trip",
  "steps": [
    {"step": 1, "tool": "route_planner", "purpose": "calculate transport cost"},
    {"step": 2, "tool": "deal_finder", "purpose": "find hotel deals"},
    {"step": 3, "tool": "weather", "purpose": "check weekend weather"}
  ]
}
```

## Error Handling

- Retry once on failure
- Structured error responses
- Never crashes UI
- Logs all failures

## Session Management

```javascript
// Get session
const session = getSession('user123');

// Update session
updateSession('user123', {
  lastIntent: 'weather',
  lastEntities: { city: 'NYC' },
  lastToolResults: {...}
});

// Clear session
clearSession('user123');
```

## Adding New Tools

1. Add tool function to `tool_registry.js`:
```javascript
async my_tool(input) {
  // Implementation
  return result;
}
```

2. Update intent parser system prompt with new intent type

3. Tool automatically available to agent

## Configuration

Set environment variables in `server/.env`:
```
OPENAI_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
NEWS_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
```

## Testing

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "What is the weather?", "sessionId": "test123"}'
```
