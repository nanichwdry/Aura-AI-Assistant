# Live discussion and “Hey Aura”

Open **Live discussion**, then choose **Voice** or **Video**. Both views use one LiveAvatar FULL Mode conversational session, so changing view preserves its conversation. Voice view hides the video; it is still a LiveAvatar session and uses the same provider credits. It is not a separate cheaper audio API. The browser microphone goes directly through the provider SDK; Aura's existing Gemini microphone pipeline is stopped when this mode opens.

## Backend setup

Use the existing Express backend, paired-device authentication, and `/api/avatar-token` endpoint. Add these to the backend host environment or `server/.env`, never to a VITE-prefixed variable:

```
AVATAR_API_KEY=
AVATAR_ID=
AVATAR_VOICE_ID=
AVATAR_CONTEXT_ID=
AVATAR_SANDBOX=true
```

Create a conversational context in the LiveAvatar dashboard and set its ID as `AVATAR_CONTEXT_ID`. Without a context, the provider only repeats supplied text and does not answer users, so the endpoint rejects live-discussion requests without it. Leave the context's opening text empty because Aura explicitly says “I'm here. How can I help?” after connecting.

Suggested context instructions:

> You are Aura, an AI voice assistant. Be warm, direct, and conversational. Give short spoken answers and let the user finish. Ask one clear question if you need more context. Match the user's language when supported. Never claim to be a human. Do not claim to access this website's tools, saved memory, current information, or perform actions unless those capabilities are connected. Say clearly when you cannot verify something.

This uses the provider's managed model, speech recognition and speech synthesis. It does not expose an OpenAI API key or create a separate OpenAI call. The existing tool executor and Gemini conversation history are not automatically injected into this provider session. Live transcripts appear in the chat and typed messages go to the live session while connected.

## Use

1. Pair in Settings. The returned device token stays in page memory and fills the live panel when opened. You can also paste an existing token. Reloading the page clears this in-memory token.
2. Allow microphone access on HTTPS (or localhost) and press **Start conversation**. Switch Voice/Video without restarting. Speak naturally, interrupt Aura, mute the microphone, or use **End call**. The top speaker button mutes Aura's output independently.
3. Optionally enable **Hey Aura** while idle. Once enabled, say “Hey Aura”, then wait for the greeting before your question. If a command is already present in the recognition result, it is forwarded to the new call. This is an explicitly enabled browser speech-recognition listener, not an OS-wide wake-word service.
4. The wake listener pauses during calls and when the tab is hidden. End call, errors and mode changes disable/release listening. It is not active after closing the page or outside supported browsers. Unsupported browsers retain the Start button. Browser speech recognition may process audio online; the UI states this before enabling it.

Connection failures and missing credentials leave normal text chat available. Autoplay-blocked browsers get a playback button. Calls have the existing five-minute provider limit, a client timeout, explicit cleanup, and no automatic paid-call retry loop. No credentials are committed.

## Verification

Run `npm run test:ui`, `npm run typecheck`, `npm run build`, and `node --test server/tests/avatar.test.js`. Mocked tests cover mode switching, interruption, transcript deduplication, typed live messages, microphone mute, cleanup during late startup, wake activation, and setup errors.

A real browser/account test is still required for microphone permissions, WebRTC/firewall connectivity, provider billing/sandbox support, lip sync, turn-taking latency, and Web Speech recognition compatibility.

Provider references: https://docs.liveavatar.com/docs/full-mode/configuration and https://docs.liveavatar.com/docs/full-mode/events. Browser recognition reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition.
