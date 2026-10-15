# Aura streaming avatar

This project runs Vite/React and Express, not Next.js. The equivalent backend endpoint is `POST /api/avatar-token` in `server/routes/avatar.js`, mounted in `server/index.js`. Deploy the Express backend and set `VITE_API_BASE_URL` on the frontend to its URL (local Vite already proxies `/api`). Vercel's static frontend alone does not run this endpoint.

## Setup

1. Obtain a LiveAvatar API key, avatar ID, and voice ID from https://app.liveavatar.com. This uses HeyGen's current `@heygen/liveavatar-web-sdk`, not the legacy Interactive Avatar SDK.
2. Set `AVATAR_API_KEY`, `AVATAR_ID`, `AVATAR_VOICE_ID`, and `AVATAR_SANDBOX=true` in **server/.env** or your backend host's environment. Never use a `VITE_` prefix for these credentials. Sandbox requires a supported sandbox avatar. Set `AVATAR_SANDBOX=false` only when ready to spend provider credits.
3. Start the Express backend and Vite frontend. Use Aura Settings to pair a device. Switch to **Avatar video mode**, enter the paired device token, and click **Connect avatar**. This token stays in component memory and is cleared when you leave avatar mode. The endpoint checks the device database even when global dev auth is disabled.
4. Send a text message or use the existing microphone flow. Text replies and completed Gemini voice transcripts go to `repeat(text)` through the component's `speak()` handle. The provider performs TTS and lip sync. Gemini audio is suppressed while the avatar is ready, so you hear one voice. Gemini voice transcripts are enabled explicitly. Speech begins after the completed response, not on partial tokens or raw PCM audio chunks.

The provider microphone starts muted; Aura's Gemini session owns input. The existing mute button also mutes the avatar video. Interruptions interrupt avatar speech. Disabling avatar mode, disconnects, connection failures, and a 30-second timeout stop the session and restore standard chat. A play button handles browsers that block autoplay. Sessions are capped at five minutes; reconnect explicitly after expiry. Token requests are limited to three per minute per paired device in this server process. For multiple backend replicas, use a shared rate limiter at the gateway.

## Validation

Run `npm run build`, `npx tsc --noEmit`, and `node --test server/tests/avatar.test.js`.

Live credential check: connect a sandbox avatar, send a typed question, confirm video and one audio voice; start Gemini voice and confirm the completed transcript is spoken; mute/unmute; interrupt; toggle off while connecting; reconnect; disconnect the network and confirm the standard voice/text path remains usable. Actual provider playback requires a funded or sandbox-enabled LiveAvatar account and browser WebRTC access.
