import express from 'express';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rateLimiter = new Map();
const MAX_PROMPT_LENGTH = 300;

router.post('/generate', async (req, res) => {
  const requestId = Date.now().toString();
  try {
    const { prompt, style = 'line_art', size = '1024x1024' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.json({ ok: false, error: { message: 'Prompt required' } });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.json({ ok: false, error: { message: `Prompt too long (max ${MAX_PROMPT_LENGTH} chars)` } });
    }

    const sessionId = req.ip;
    const now = Date.now();
    const lastCall = rateLimiter.get(sessionId) || 0;
    if (now - lastCall < 5000) {
      return res.status(429).json({ ok: false, error: { message: 'Rate limit: wait 5s between requests' } });
    }
    rateLimiter.set(sessionId, now);

    const fullPrompt = `Create a clean minimal line-art sketch for the following description. White background. Black ink lines. No shading. No colors. Simple but accurate outlines. High contrast. Centered composition. Description: ${prompt}`;

    console.log(`[${requestId}] Generating sketch for prompt: ${prompt.substring(0, 50)}...`);

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: size,
      response_format: 'b64_json'
    });

    const imageBase64 = response.data[0].b64_json;

    console.log(`[${requestId}] Sketch generated successfully`);
    res.json({ ok: true, image_base64: imageBase64 });
  } catch (error) {
    console.error(`[${requestId}] Sketch generation error:`, error.message);
    res.json({ ok: false, error: { message: error.message } });
  }
});

export default router;
