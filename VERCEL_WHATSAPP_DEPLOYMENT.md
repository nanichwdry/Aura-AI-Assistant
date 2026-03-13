# Vercel WhatsApp Webhook Deployment - COMPLETE

## Problem Solved
Vercel was proxying `/api/*` to Render backend. WhatsApp webhook needs to run directly on Vercel as serverless function.

## Files Changed

### 1. Created: `api/whatsapp/webhook.js`
- Vercel serverless function wrapper
- Delegates to existing `server/controllers/whatsappController.js`
- Handles GET (verification) and POST (messages)
- No business logic duplication

### 2. Modified: `vercel.json`
**Before:**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://aura-ai-assistant.onrender.com/api/$1" }
  ]
}
```

**After:**
```json
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

### 3. Modified: `server/services/searchService.js`
Added startup logging:
```javascript
// Log active search provider on startup
if (process.env.SEARXNG_BASE_URL) {
  console.log('[SearchService] Provider: SearXNG');
} else if (process.env.BRAVE_SEARCH_API_KEY) {
  console.log('[SearchService] Provider: Brave Search');
} else {
  console.log('[SearchService] Provider: DuckDuckGo (fallback)');
}
```

### 4. Created: `VERCEL_ENV_VARS.md`
Complete environment variable documentation for Vercel Dashboard

## Architecture

```
WhatsApp Message
    ↓
Meta Cloud API
    ↓
Vercel: /api/whatsapp/webhook.js (serverless wrapper)
    ↓
server/controllers/whatsappController.js
    ↓
server/services/auraMessageRouter.js
    ↓
server/services/searchService.js (SearXNG → Brave → DuckDuckGo)
    ↓
server/services/scrapeService.js
    ↓
server/agent/agent_core.js (existing Aura pipeline)
    ↓
server/services/whatsappService.js
    ↓
Meta Cloud API (send reply)
```

## Deployment Steps

### 1. Configure Vercel Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

**Required:**
```
WHATSAPP_VERIFY_TOKEN=your_secure_token
WHATSAPP_ACCESS_TOKEN=your_meta_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

**Optional (Search Providers):**
```
SEARXNG_BASE_URL=https://your-searxng.com
BRAVE_SEARCH_API_KEY=your_brave_key
```

### 2. Deploy to Vercel
```bash
git add .
git commit -m "Add Vercel WhatsApp webhook support"
git push
```

Vercel auto-deploys on push.

### 3. Test Webhook Verification
```bash
curl "https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

Expected response: `test123`

### 4. Configure Meta Webhook
Meta Developer Dashboard → WhatsApp → Configuration:
- **Callback URL:** `https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook`
- **Verify Token:** Same as `WHATSAPP_VERIFY_TOKEN`
- **Webhook Fields:** Subscribe to `messages`

### 5. Test End-to-End
Send WhatsApp message to your business number. Aura should:
1. Receive message
2. Detect search intent (if applicable)
3. Search web using configured provider
4. Scrape top results
5. Route through agent_core
6. Reply via WhatsApp

## Verification Checklist

- [ ] Vercel environment variables configured
- [ ] Project redeployed
- [ ] GET webhook returns challenge
- [ ] Meta webhook verified successfully
- [ ] Test message receives Aura reply
- [ ] Search provider logged in Vercel function logs
- [ ] WhatsApp responses truncated to 1000 chars
- [ ] Sources appended to responses

## Production URL

**Webhook Endpoint:**
```
https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook
```

## Search Provider Priority

1. **SearXNG** (if `SEARXNG_BASE_URL` set)
2. **Brave Search** (if `BRAVE_SEARCH_API_KEY` set)
3. **DuckDuckGo** (always available fallback)

Check Vercel function logs for active provider on cold start.

## Notes

- No Express server migration needed
- Thin Vercel wrapper delegates to existing controllers
- All business logic remains in `server/` directory
- WhatsApp integration reuses existing Aura pipeline
- Search service supports multiple providers with automatic fallback
- Responses are channel-aware (WhatsApp gets 1000 char limit)

## Troubleshooting

**Webhook verification fails:**
- Check `WHATSAPP_VERIFY_TOKEN` matches Meta dashboard
- Verify environment variables deployed (redeploy if needed)

**No response to messages:**
- Check Vercel function logs for errors
- Verify `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
- Ensure `GEMINI_API_KEY` and `OPENAI_API_KEY` are set

**Search not working:**
- Check function logs for search provider
- Verify provider credentials if using SearXNG/Brave
- DuckDuckGo fallback always works (no credentials needed)
