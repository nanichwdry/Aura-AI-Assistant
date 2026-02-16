import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseIntent(message) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Parse user intent and return JSON:
{
  "intent": "route_planner|internet_agent|code_analyzer|deal_finder|maps|weather|news|music|games|notepad|sketchpad|translator|informational",
  "entities": {},
  "requiredTools": ["tool1"],
  "confidence": 0.0-1.0
}

Examples:
"Find route to NYC" -> {"intent":"route_planner","entities":{"destination":"NYC"},"requiredTools":["route_planner"],"confidence":0.9}
"Analyze this code" -> {"intent":"code_analyzer","entities":{},"requiredTools":["code_analyzer"],"confidence":0.95}
"What's the weather" -> {"intent":"weather","entities":{},"requiredTools":["weather"],"confidence":0.98}`
    }, {
      role: 'user',
      content: message
    }],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}
