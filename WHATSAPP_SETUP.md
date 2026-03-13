# WhatsApp Integration - Environment Variables

Add these to your `server/.env` file:

## WhatsApp Cloud API
```env
WHATSAPP_VERIFY_TOKEN=your_random_secure_token_here
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

## Search APIs (Optional - uses fallback if not provided)
```env
GOOGLE_SEARCH_API_KEY=your_google_custom_search_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

## How to Get WhatsApp Credentials

### 1. Create Meta App
1. Go to https://developers.facebook.com/
2. Create a new app
3. Add "WhatsApp" product
4. Go to WhatsApp > Getting Started

### 2. Get Phone Number ID
- In WhatsApp > Getting Started
- Copy the "Phone number ID"
- Add to `.env` as `WHATSAPP_PHONE_NUMBER_ID`

### 3. Get Access Token
- In WhatsApp > Getting Started
- Copy the temporary access token (24 hours)
- For production: Generate permanent token in System Users
- Add to `.env` as `WHATSAPP_ACCESS_TOKEN`

### 4. Create Verify Token
- Generate a random secure string (e.g., `openssl rand -hex 32`)
- Add to `.env` as `WHATSAPP_VERIFY_TOKEN`

### 5. Register Webhook
1. In WhatsApp > Configuration
2. Click "Edit" on Webhook
3. Enter callback URL: `https://your-domain.com/api/whatsapp/webhook`
4. Enter verify token (same as `WHATSAPP_VERIFY_TOKEN`)
5. Click "Verify and Save"
6. Subscribe to "messages" webhook field

## How to Get Google Search API (Optional)

### 1. Enable Custom Search API
1. Go to https://console.cloud.google.com/
2. Enable "Custom Search API"
3. Create credentials (API Key)
4. Add to `.env` as `GOOGLE_SEARCH_API_KEY`

### 2. Create Search Engine
1. Go to https://programmablesearchengine.google.com/
2. Create new search engine
3. Select "Search the entire web"
4. Copy the Search Engine ID
5. Add to `.env` as `GOOGLE_SEARCH_ENGINE_ID`

## Testing

### Test Webhook Verification
```bash
curl "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test123"
```

Should return: `test123`

### Send Test Message
Send a WhatsApp message to your registered number. Aura should respond.

## Notes

- WhatsApp webhook must be HTTPS (use ngrok for local testing)
- Webhook responds with 200 immediately (async processing)
- Search service falls back to DuckDuckGo if Google API not configured
- All messages are routed through existing Aura agent pipeline
