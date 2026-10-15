// LiveAvatar credentials stay on the Express server, never in Vite's bundle.
export function createAvatarTokenHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const attempts = new Map();
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    // Enforce pairing even when the global development auth bypass is enabled.
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const device = token && req.app.get('db').prepare(
      'SELECT id FROM devices WHERE token = ? AND revoked = 0'
    ).get(token);
    if (!device) return res.status(401).json({ error: 'Enter a valid paired device token in Avatar mode.' });
    if (!env.AVATAR_API_KEY || !env.AVATAR_ID || !env.AVATAR_VOICE_ID) {
      return res.status(503).json({ error: 'Avatar streaming is not configured on the server.' });
    }
    const conversation = req.body?.conversation === true;
    if (conversation && !env.AVATAR_CONTEXT_ID) {
      return res.status(503).json({ error: 'Live discussion needs AVATAR_CONTEXT_ID on the server. Configure Aura’s conversational context first.' });
    }
    const time = now();
    for (const [id, entry] of attempts) if (time - entry.start >= 60000) attempts.delete(id);
    const entry = attempts.get(device.id) || { start: time, count: 0 };
    if (entry.count >= 3) return res.status(429).json({ error: 'Please wait a minute before reconnecting.' });
    entry.count++;
    attempts.set(device.id, entry);
    try {
      const upstream = await fetchImpl('https://api.liveavatar.com/v1/sessions/token', {
        method: 'POST',
        headers: { 'X-API-KEY': env.AVATAR_API_KEY, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          mode: 'FULL', avatar_id: env.AVATAR_ID,
          is_sandbox: env.AVATAR_SANDBOX !== 'false',
          max_session_duration: 300,
          interactivity_type: 'CONVERSATIONAL',
          avatar_persona: { voice_id: env.AVATAR_VOICE_ID, language: 'en',
            ...(conversation ? { context_id: env.AVATAR_CONTEXT_ID } : {}),
          },
        }),
      });
      if (!upstream.ok) return res.status(502).json({ error: 'Avatar provider could not create a session.' });
      const data = await upstream.json();
      if (typeof data?.data?.session_token !== 'string') throw new Error('Invalid provider response');
      return res.json({ sessionToken: data.data.session_token });
    } catch {
      return res.status(502).json({ error: 'Avatar provider is unavailable. Standard chat is still available.' });
    }
  };
}
