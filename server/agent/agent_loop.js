import { tools } from './tool_registry.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function executeLoop(plan, sessionId) {
  const results = [];
  const executionLog = [];

  for (const step of plan.steps) {
    try {
      // Execute tool
      const tool = tools[step.tool];
      if (!tool) {
        executionLog.push({ step: step.step, status: 'failed', reason: `Tool ${step.tool} not found` });
        continue;
      }

      const result = await tool(step.input);
      
      // Validate output
      const isValid = await validateOutput(result, step.purpose);
      
      if (!isValid) {
        // Try fallback
        const fallback = await tryFallback(step, results);
        if (fallback) {
          results.push({ step: step.step, tool: step.tool, result: fallback, status: 'fallback' });
          executionLog.push({ step: step.step, status: 'fallback', tool: step.tool });
        } else {
          executionLog.push({ step: step.step, status: 'failed', reason: 'validation failed, no fallback' });
        }
        continue;
      }

      // Store result
      results.push({ step: step.step, tool: step.tool, result, status: 'success' });
      executionLog.push({ step: step.step, status: 'success', tool: step.tool });

    } catch (error) {
      executionLog.push({ step: step.step, status: 'error', reason: error.message });
    }
  }

  // Synthesize final recommendation
  const recommendation = await synthesizeResults(plan.goal, results);

  return {
    stepsExecuted: executionLog,
    results,
    finalRecommendation: recommendation
  };
}

async function validateOutput(result, purpose) {
  if (!result) return false;
  if (result.success === false) return false;
  if (result.error) return false;
  return true;
}

async function tryFallback(step, previousResults) {
  // Simple fallback: return null (could be enhanced with alternative tools)
  return null;
}

async function synthesizeResults(goal, results) {
  if (results.length === 0) {
    return { summary: 'No results to synthesize', confidence: 0 };
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Synthesize results into a final recommendation for goal: "${goal}". Be concise. Return JSON: {"summary": "...", "confidence": 0-1}`
    }, {
      role: 'user',
      content: JSON.stringify(results)
    }],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}
