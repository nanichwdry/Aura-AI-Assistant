import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rateLimiter = new Map();
const MAX_CODE_SIZE = 80000;

const SYSTEM_PROMPT = `You are Aura Code Analyzer & Code Editor.
Rules:
1) Minimal diffs only. Preserve structure and names.
2) Do NOT add dependencies unless explicitly allowed.
3) Do NOT say "assume sanitized" or similar. Either render as text safely OR propose a concrete sanitization plan.
4) For React fetch/useEffect: must handle dependency arrays, abort controller, response.ok, error state, and stale updates.
5) Memoization is not a fix for an absurdly expensive operation; call that out and remove/replace it.
Output JSON only, exactly:
{
  "summary": { "risk_level": "low|medium|high", "main_problems": [], "what_i_changed": [], "what_i_did_not_change": [] },
  "issues": [ { "category":"correctness|security|performance|accessibility|dx", "severity":"low|medium|high", "title":"", "why_it_matters":"", "where":{"path":"","lines":"L?-L?"}, "fix":"" } ],
  "patches": [ { "path":"", "patch_unified_diff":"" } ],
  "final_files": [ { "path":"", "content":"" } ],
  "quick_tests": []
}
No extra keys. No markdown. No commentary.`;

router.post('/analyze', async (req, res) => {
  const requestId = Date.now().toString();
  try {
    const { code, language = 'tsx', path = 'file', goal, constraints } = req.body;
    
    if (!code) return res.json({ ok: false, error: { message: 'Code required' }, data: null });
    if (code.length > MAX_CODE_SIZE) return res.status(413).json({ ok: false, error: { message: 'Code too large (max 80k chars)' }, data: null });
    
    const sessionId = req.ip;
    const now = Date.now();
    const lastCall = rateLimiter.get(sessionId) || 0;
    if (now - lastCall < 2000) return res.status(429).json({ ok: false, error: { message: 'Rate limit: wait 2s between requests' }, data: null });
    rateLimiter.set(sessionId, now);
    
    const userPrompt = `Analyze this ${language} code${goal ? ` (Goal: ${goal})` : ''}${constraints ? ` (Constraints: ${constraints.join(', ')})` : ''}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn analysis as JSON.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    const rawOutput = completion.choices[0].message.content;
    let result;
    
    try {
      result = JSON.parse(rawOutput);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse failed:`, parseError.message);
      console.error(`[${requestId}] Raw output (first 500 chars):`, rawOutput.substring(0, 500));
      return res.json({ 
        ok: false, 
        error: { message: 'Model returned invalid JSON', details: parseError.message },
        raw_model_output: rawOutput.substring(0, 1000),
        data: null 
      });
    }
    
    if (!result.summary || !result.issues || !result.patches || !result.final_files || !result.quick_tests) {
      console.error(`[${requestId}] Missing required keys:`, Object.keys(result));
      return res.json({ 
        ok: false, 
        error: { message: 'Model response missing required keys', details: `Got: ${Object.keys(result).join(', ')}` },
        raw_model_output: rawOutput.substring(0, 1000),
        data: null 
      });
    }
    
    console.log(`[${requestId}] Analysis success: ${result.issues.length} issues found`);
    res.json({ ok: true, data: result, error: null });
  } catch (error) {
    console.error(`[${requestId}] Analyze error:`, error.message);
    res.json({ ok: false, error: { message: error.message }, data: null });
  }
});

router.post('/fix', async (req, res) => {
  const requestId = Date.now().toString();
  try {
    const { code, language = 'tsx', path = 'file', goal, constraints } = req.body;
    
    if (!code) return res.json({ ok: false, error: { message: 'Code required' }, data: null });
    if (code.length > MAX_CODE_SIZE) return res.status(413).json({ ok: false, error: { message: 'Code too large (max 80k chars)' }, data: null });
    
    const sessionId = req.ip;
    const now = Date.now();
    const lastCall = rateLimiter.get(sessionId) || 0;
    if (now - lastCall < 2000) return res.status(429).json({ ok: false, error: { message: 'Rate limit: wait 2s between requests' }, data: null });
    rateLimiter.set(sessionId, now);
    
    const userPrompt = `Fix issues in this ${language} code${goal ? ` (Goal: ${goal})` : ''}${constraints ? ` (Constraints: ${constraints.join(', ')})` : ''}:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nReturn fixed code with patches as JSON.`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    const rawOutput = completion.choices[0].message.content;
    let result;
    
    try {
      result = JSON.parse(rawOutput);
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse failed:`, parseError.message);
      console.error(`[${requestId}] Raw output (first 500 chars):`, rawOutput.substring(0, 500));
      return res.json({ 
        ok: false, 
        error: { message: 'Model returned invalid JSON', details: parseError.message },
        raw_model_output: rawOutput.substring(0, 1000),
        data: null 
      });
    }
    
    if (!result.summary || !result.issues || !result.patches || !result.final_files || !result.quick_tests) {
      console.error(`[${requestId}] Missing required keys:`, Object.keys(result));
      return res.json({ 
        ok: false, 
        error: { message: 'Model response missing required keys', details: `Got: ${Object.keys(result).join(', ')}` },
        raw_model_output: rawOutput.substring(0, 1000),
        data: null 
      });
    }
    
    if (result.patches.length === 0 && result.final_files.length > 0) {
      console.warn(`[${requestId}] Warning: final_files provided but patches empty`);
    }
    
    console.log(`[${requestId}] Fix success: ${result.issues.length} issues, ${result.patches.length} patches`);
    res.json({ ok: true, data: result, error: null });
  } catch (error) {
    console.error(`[${requestId}] Fix error:`, error.message);
    res.json({ ok: false, error: { message: error.message }, data: null });
  }
});

export default router;
