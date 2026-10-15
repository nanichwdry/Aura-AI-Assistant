# Playback and website reliability fixes

## Fixed

- Music stays mounted while minimized. The compact player exposes restore, pause/play, previous/next and close controls. Opening Music from the toolkit restores the existing player. Closing either view destroys the YouTube player, preventing orphaned audio.
- YouTube initialization is shared, waits for the actual Player API, and times out with a visible error. Strict Mode/unmount cleanup cannot create a late orphan player. Track completion uses the current playlist rather than a stale initial callback. Search failures and blocked autoplay are visible; closing aborts pending search.
- Removed the duplicate Sketchpad modal.
- Music, games, notes, sketchpad, places, code tools, PC controls and terminal chat now use the shared backend URL. Both VITE_API_BASE_URL and the older VITE_API_URL are supported; without either, local Vite uses its proxy.
- Pairing now sends the returned pair_id rather than the display code. HTTP errors cannot be reported as successful pairing. Settings uses the configured backend and the public health check, with a copy-token control for avatar setup.
- Typed chat cannot submit another request while a reply is pending and shows a thinking state.
- Voice tool execution and memory writes now send the missing POST bodies. Failed memory writes no longer report success.
- Voice session failures, disconnects and unmount stop microphone tracks and audio. A stopped session cannot reconnect after a late microphone permission result.
- Printable conversation content is escaped so model/user text cannot become executable HTML.
- Fixed the chat types import, PC-control discriminated union checks, and Google Maps / VS Code type dependencies. Repository-wide type checking now passes.

## Checks

- `npm run test:ui`: mocked React regression tests for music lifecycle, pairing, duplicate Sketchpad, pending chat, late microphone permission, and safe printable text.
- `npm run typecheck`
- `npm run build`
- `node --test server/tests/avatar.test.js`
- `git diff --check`

## Remaining live verification

Tests run in jsdom with mocked providers, not a full browser. Check playback with a real YouTube-enabled backend and browser autoplay rules, microphone permissions with Gemini, LiveAvatar credentials, and each configured external tool service after deployment. These changes address the issues found in the code review; they do not certify every external integration as working.
