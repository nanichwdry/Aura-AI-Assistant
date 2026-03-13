# Vercel Production Environment Variables

Configure these in Vercel Dashboard → Project Settings → Environment Variables

## Required for WhatsApp Integration

```
WHATSAPP_VERIFY_TOKEN=your_secure_random_token_here
WHATSAPP_ACCESS_TOKEN=your_meta_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

## Search Provider Configuration (Optional)

Priority order: SearXNG → Brave → DuckDuckGo

### Option 1: SearXNG (Highest Priority)
```
SEARXNG_BASE_URL=https://your-searxng-instance.com
```

### Option 2: Brave Search
```
BRAVE_SEARCH_API_KEY=your_brave_api_key_here
```

### Option 3: DuckDuckGo
No configuration needed - automatic fallback

## AI Services

```
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Google Services (Optional)

```
GOOGLE_MAPS_API_KEY=your_maps_api_key
GOOGLE_AIR_QUALITY_API_KEY=your_air_quality_api_key
GOOGLE_POLLEN_API_KEY=your_pollen_api_key
GOOGLE_ROUTES_API_KEY=your_routes_api_key
GOOGLE_TIMEZONE_API_KEY=your_timezone_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

## Other Services

```
OPENWEATHER_API_KEY=your_openweather_api_key
NEWS_API_KEY=your_news_api_key
```

## Webhook URL for Meta Dashboard

```
https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook
```

## Verification Steps

1. Add all environment variables in Vercel Dashboard
2. Redeploy the project
3. Test webhook verification:
   ```
   GET https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123
   ```
   Should return: `test123`

4. Configure Meta Webhook:
   - URL: `https://aura-ai-assistant-nine.vercel.app/api/whatsapp/webhook`
   - Verify Token: Same as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: `messages`

5. Send test WhatsApp message to verify end-to-end flow

## Search Provider Logging

Check Vercel function logs for startup message:
- `[SearchService] Provider: SearXNG` (if SEARXNG_BASE_URL set)
- `[SearchService] Provider: Brave Search` (if BRAVE_SEARCH_API_KEY set)
- `[SearchService] Provider: DuckDuckGo (fallback)` (default)
