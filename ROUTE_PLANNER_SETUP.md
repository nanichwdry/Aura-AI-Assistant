# Aura Route Planner - Setup Guide

## Overview
Route Planner uses Google Maps Routes API to find optimal driving routes with toll information.

## Features
- Best route (fastest ETA)
- No-tolls alternative route
- Distance and ETA comparison
- Toll cost estimates (when available)
- Smart recommendations based on user preference

## Setup Instructions

### 1. Enable Google Maps Routes API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Routes API** (Directions API v2)
4. Create API credentials:
   - Go to APIs & Services > Credentials
   - Create API Key
   - Restrict key to Routes API only (recommended)

### 2. Configure Environment Variable

Add to `server/.env` or root `.env`:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**IMPORTANT**: Use `GOOGLE_MAPS_API_KEY` (server-only), NOT `VITE_GOOGLE_MAPS_API_KEY`

### 3. Restart Server

```bash
cd server
npm start
```

## Usage

### Via Tool UI
1. Click "Route Planner" in Tools sidebar
2. Enter origin (e.g., "New Market, MD")
3. Enter destination (e.g., "Baltimore, MD")
4. Select preference: Fastest / Cheapest / Avoid Tolls
5. Click "Find Route"

### Via Voice/Chat
- "Route from New Market MD to Baltimore MD"
- "Best route to DC"
- "Avoid tolls to Baltimore"
- "How much are tolls from Frederick to DC"

## API Response Format

```json
{
  "success": true,
  "data": {
    "origin": "New Market, MD",
    "destination": "Baltimore, MD",
    "best": {
      "durationSec": 3600,
      "distanceMeters": 80000,
      "toll": { "currency": "USD", "units": 4.25 },
      "hasTolls": true,
      "summary": "Via I-70 E and I-695"
    },
    "noTolls": {
      "durationSec": 4200,
      "distanceMeters": 85000,
      "toll": null,
      "hasTolls": false,
      "summary": "Via US-40 E"
    },
    "recommendation": {
      "choice": "best",
      "reason": "Saves 10 min but costs ~$4.25 in tolls."
    }
  }
}
```

## Error Handling

### Invalid Address
```json
{
  "success": false,
  "error": "Routes API error: 400 Invalid address"
}
```

### No Route Found
```json
{
  "success": false,
  "error": "No driving route found for these locations."
}
```

### Missing API Key
```json
{
  "success": false,
  "error": "Google Maps API key not configured"
}
```

## Toll Information

- If toll price available: Shows exact amount (e.g., "$4.25")
- If tolls exist but price unavailable: Shows "may apply (price unavailable)"
- If no tolls: Shows "none"

## Recommendation Logic

### Fastest Preference
- Chooses route with lowest duration
- Shows time saved and toll cost tradeoff

### Cheapest Preference
- Chooses route with lowest toll cost
- If toll info missing, prefers no-tolls route

### Avoid Tolls Preference
- Always chooses no-tolls route
- Shows time tradeoff

## Testing

```bash
# Test via curl
curl -X POST http://localhost:3001/api/tools/run \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "route_planner",
    "input": {
      "origin": "New Market, MD",
      "destination": "Baltimore, MD",
      "preference": "fastest"
    }
  }'
```

## Troubleshooting

### "Routes API error: 403"
- API key not enabled for Routes API
- Check API restrictions in Google Cloud Console

### "Routes API error: 429"
- Rate limit exceeded
- Check quota in Google Cloud Console

### "No driving route found"
- Invalid addresses
- No road connection between locations
- Try more specific addresses (include city/state)

## Cost Estimate

Google Maps Routes API pricing (as of 2025):
- Basic: $5.00 per 1,000 requests
- Advanced (with tolls): $10.00 per 1,000 requests

Each route search = 2 API calls (best + no-tolls)

## Security

✅ API key stored server-side only
✅ Never exposed to frontend
✅ Requests proxied through backend
✅ Input validation on server

---

**Status**: ✅ Implemented
**API**: Google Maps Routes API (Directions v2)
**Backend**: `/api/tools/run` with `tool: "route_planner"`
**Frontend**: `AuraRoutePlanner.tsx` component
