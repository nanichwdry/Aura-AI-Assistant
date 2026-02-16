# Multi-Step Agent Test Cases

## Test Case 1: Simple Single-Step
**Input:** "What's the weather in NYC?"

**Expected Plan:**
```json
{
  "goal": "Get NYC weather",
  "needsClarification": false,
  "steps": [
    {"step": 1, "tool": "weather", "purpose": "fetch weather data", "input": {"city": "NYC"}}
  ]
}
```

**Expected Response:**
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

---

## Test Case 2: Multi-Step with Clarification
**Input:** "Plan a weekend trip to NYC under $800"

**Expected Plan:**
```json
{
  "goal": "Plan affordable NYC weekend trip",
  "needsClarification": true,
  "clarificationQuestion": "What is your departure city?",
  "steps": []
}
```

**Expected Response:**
```json
{
  "success": true,
  "type": "clarification",
  "reasoning": "Need more information to proceed",
  "data": {"question": "What is your departure city?"},
  "confidence": 0.5
}
```

---

## Test Case 3: Multi-Step with Full Context
**Input:** "Plan a weekend trip from DC to NYC under $800"

**Expected Plan:**
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

**Expected Response:**
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
    "summary": "Trip plan: Drive 4h ($50 gas), stay at Budget Hotel ($300/2 nights), weather forecast: sunny 25°C. Total: ~$350, well under budget.",
    "confidence": 0.85
  },
  "reasoningSummary": "Goal: Plan affordable DC to NYC weekend trip. Executed 3/3 steps successfully. Trip plan: Drive 4h ($50 gas), stay at Budget Hotel ($300/2 nights), weather forecast: sunny 25°C. Total: ~$350, well under budget.",
  "confidence": 0.85
}
```

---

## Test Case 4: Code Analysis Chain
**Input:** "Analyze this code and suggest improvements: function add(a,b){return a+b}"

**Expected Plan:**
```json
{
  "goal": "Analyze code and provide improvements",
  "needsClarification": false,
  "steps": [
    {"step": 1, "tool": "code_analyzer", "purpose": "analyze code quality", "input": {"code": "function add(a,b){return a+b}"}},
    {"step": 2, "tool": "code_editor", "purpose": "generate improved version", "input": {"text": "Improve this function with type safety and documentation"}}
  ]
}
```

---

## Test Case 5: Research Chain
**Input:** "Tell me about quantum computing and find recent news"

**Expected Plan:**
```json
{
  "goal": "Research quantum computing with recent news",
  "needsClarification": false,
  "steps": [
    {"step": 1, "tool": "wikipedia", "purpose": "get overview", "input": {"query": "quantum computing"}},
    {"step": 2, "tool": "news", "purpose": "find recent articles", "input": {"query": "quantum computing"}}
  ]
}
```

---

## Test Case 6: Failure Handling
**Input:** "Find route from Mars to NYC"

**Expected Plan:**
```json
{
  "goal": "Find route from Mars to NYC",
  "needsClarification": false,
  "steps": [
    {"step": 1, "tool": "route_planner", "purpose": "calculate route", "input": {"origin": "Mars", "destination": "NYC"}}
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "type": "action",
  "goal": "Find route from Mars to NYC",
  "stepsExecuted": [{"step": 1, "status": "failed", "reason": "validation failed, no fallback"}],
  "finalRecommendation": {"summary": "No results to synthesize", "confidence": 0},
  "reasoningSummary": "Goal: Find route from Mars to NYC. Executed 0/1 steps successfully. No results to synthesize",
  "confidence": 0
}
```

---

## Testing Commands

```bash
# Test 1: Simple weather
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "What is the weather in NYC?", "sessionId": "test1"}'

# Test 2: Clarification needed
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Plan a weekend trip to NYC under $800", "sessionId": "test2"}'

# Test 3: Multi-step with context
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Plan a weekend trip from DC to NYC under $800", "sessionId": "test3"}'

# Test 4: Code analysis chain
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Analyze this code: function add(a,b){return a+b}", "sessionId": "test4"}'

# Test 5: Research chain
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"text": "Tell me about quantum computing and find recent news", "sessionId": "test5"}'
```

---

## Validation Checklist

- [ ] Single-step requests work
- [ ] Multi-step plans execute in sequence
- [ ] Clarification questions asked when needed
- [ ] Failed steps handled gracefully
- [ ] Results synthesized into final recommendation
- [ ] Session memory stores execution history
- [ ] Confidence scores calculated
- [ ] Reasoning summary explains decisions
- [ ] Max 5 steps enforced
- [ ] Tool chaining works correctly
