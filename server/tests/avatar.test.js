import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAvatarTokenHandler } from '../routes/avatar.js';
const env = { AVATAR_API_KEY: 'secret', AVATAR_ID: 'avatar', AVATAR_VOICE_ID: 'voice' };
function request(valid = true) {
  return { headers: { authorization: 'Bearer paired' }, app: { get: () => ({ prepare: () => ({ get: () => valid ? { id: 1 } : undefined }) }) } };
}
function response() {
  return { code: 200, headers: {}, set(k,v) { this.headers[k] = v; return this; }, status(c) { this.code = c; return this; }, json(body) { this.body = body; return this; } };
}
test('unpaired callers cannot mint tokens, even with dev auth disabled', async () => {
  const res = response();
  await createAvatarTokenHandler({ env, fetchImpl: () => { throw Error('must not call'); } })(request(false), res);
  assert.equal(res.code, 401);
});
test('provider key stays server-side; sandbox and session limit default safely', async () => {
  const res = response();
  await createAvatarTokenHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.liveavatar.com/v1/sessions/token');
    assert.equal(options.headers['X-API-KEY'], 'secret');
    const body = JSON.parse(options.body);
    assert.equal(body.is_sandbox, true);
    assert.equal(body.max_session_duration, 300);
    return { ok: true, json: async () => ({ data: { session_token: 'temporary' } }) };
  } })(request(), res);
  assert.deepEqual(res.body, { sessionToken: 'temporary' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('missing configuration fails closed', async () => {
  const res = response();
  await createAvatarTokenHandler({ env: {} })(request(), res);
  assert.equal(res.code, 503);
});
test('upstream failures do not leak response bodies or credentials', async () => {
  const handler = createAvatarTokenHandler({ env, fetchImpl: async () => { throw Error('secret'); } });
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 502);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
});
test('repeated token requests are limited per device', async () => {
  const handler = createAvatarTokenHandler({ env, fetchImpl: async () => ({ ok: false }) });
  for (let i=0; i<3; i++) await handler(request(), response());
  const res = response();
  await handler(request(), res);
  assert.equal(res.code, 429);
});
test('live discussion requires a conversational context, so it cannot silently start in repeat-only mode', async () => {
  const req = request(); req.body = { conversation: true };
  const res = response();
  await createAvatarTokenHandler({ env })(req, res);
  assert.equal(res.code, 503);
  assert.ok(res.body.error.includes('AVATAR_CONTEXT_ID'));
});
test('live discussion passes only the server-configured persona and conversational mode', async () => {
  const req = request(); req.body = { conversation: true, context_id: 'untrusted' };
  const res = response();
  await createAvatarTokenHandler({ env: { ...env, AVATAR_CONTEXT_ID: 'aura-context' }, fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.avatar_persona.context_id, 'aura-context');
    assert.equal(body.interactivity_type, 'CONVERSATIONAL');
    return { ok: true, json: async () => ({ data: { session_token: 'temporary' } }) };
  } })(req, res);
  assert.equal(res.code, 200);
});
