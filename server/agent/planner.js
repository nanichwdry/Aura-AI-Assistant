import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createPlan(message, availableTools) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `You are a planning engine. Break complex requests into steps (max 5).

Available tools: ${availableTools.join(', ')}

Return JSON:
{
  "goal": "clear goal statement",
  "needsClarification": false,
  "clarificationQuestion": null,
  "steps": [
    {"step": 1, "tool": "tool_name", "purpose": "why this tool", "input": {...}},
    {"step": 2, "tool": "tool_name", "purpose": "why this tool", "input": {...}}
  ]
}

If missing critical data, set needsClarification=true and provide ONE question.

Examples:
"Plan NYC trip under $800" -> 
{
  "goal": "Plan affordable NYC weekend trip",
  "needsClarification": true,
  "clarificationQuestion": "What is your departure city?",
  "steps": []
}

"What's the weather in NYC" ->
{
  "goal": "Get NYC weather",
  "needsClarification": false,
  "clarificationQuestion": null,
  "steps": [{"step": 1, "tool": "weather", "purpose": "fetch weather data", "input": {"city": "NYC"}}]
}`
    }, {
      role: 'user',
      content: message
    }],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}
