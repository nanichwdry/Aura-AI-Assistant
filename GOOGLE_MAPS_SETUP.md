# Google Maps Integration Setup Guide

## Overview

Your Aura AI Assistant now includes Google Maps integration with:
- **Address Autocomplete**: Real-time address suggestions as you type
- **Multiple Map Views**: Roadmap, Satellite, Hybrid, and Terrain views
- **Interactive Search**: Click suggestions to navigate to locations
- **3D Visualization**: Street View and 3D building support
- **Quick Actions**: Open in Google Maps, get directions

## Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Create credentials → API Key
5. Restrict the API key (recommended):
   - Application restrictions: HTTP referrers
   - Add: `http://localhost:5173/*` and your domain
   - API restrictions: Select the 3 APIs above

### 2. Configure Environment Variables

Add to your `.env` file:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Features Included

#### Address Autocomplete
- Type any address or place name
- Real-time suggestions appear below search bar
- Click any suggestion to navigate to location
- Supports addresses, businesses, landmarks

#### Map Views
- **Roadmap**: Standard street map view
- **Satellite**: Aerial imagery
- **Hybrid**: Satellite with street labels
- **Terrain**: Topographical features

#### Interactive Features
- Click markers for location details
- Street View integration (click street view icon)
- Zoom and pan controls
- Full-screen mode available

#### Side Panel Actions
- **Open in Google Maps**: Launch location in Google Maps
- **Get Directions**: Open directions in Google Maps
- **Save to Favorites**: (Coming soon)
- **Share Location**: (Coming soon)
- **Find Nearby Places**: (Coming soon)

### 4. Usage Examples

#### Voice Commands (via Aura)
- "Open Maps"
- "Show me New York on the map"
- "Find restaurants near me"
- "Navigate to Central Park"

#### Manual Usage
1. Click "Maps" in the AI Tools sidebar
2. Type address in search bar
3. Select from suggestions dropdown
4. Use map controls to change view
5. Click actions in side panel

### 5. API Costs

Google Maps pricing (as of 2024):
- **Maps JavaScript API**: $7 per 1,000 loads
- **Places API**: $17 per 1,000 requests
- **Geocoding API**: $5 per 1,000 requests

**Free tier**: $200 credit monthly (covers ~28K map loads)

### 6. Troubleshooting

#### Maps not loading
- Check API key is correct in `.env`
- Verify APIs are enabled in Google Cloud Console
- Check browser console for errors
- Ensure domain is whitelisted in API restrictions

#### Autocomplete not working
- Verify Places API is enabled
- Check API key has Places API access
- Look for quota exceeded errors

#### Performance issues
- Consider implementing request debouncing
- Add caching for frequent searches
- Monitor API usage in Google Cloud Console

### 7. Customization Options

#### Map Styling
Edit `GoogleMaps.tsx` to customize:
```typescript
styles: [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }]
  }
  // Add more custom styles
]
```

#### Search Types
Modify autocomplete types in `GoogleMaps.tsx`:
```typescript
types: ['address', 'establishment', 'geocode']
```

#### Default Location
Change default center in `GoogleMaps.tsx`:
```typescript
center: { lat: 40.7128, lng: -74.0060 }, // NYC
```

### 8. Security Best Practices

1. **Restrict API Key**: Always restrict by domain/IP
2. **Monitor Usage**: Set up billing alerts
3. **Rate Limiting**: Implement client-side rate limiting
4. **Environment Variables**: Never commit API keys to git

### 9. Future Enhancements

Planned features:
- **Route Planning**: Integration with existing route planner
- **Location History**: Save frequently visited places
- **Offline Maps**: Cache map tiles for offline use
- **Custom Markers**: Add custom location markers
- **Geofencing**: Location-based notifications

## File Structure

```
src/
├── components/
│   ├── GoogleMaps.tsx          # Main maps component
│   └── AuraMapsDrawer.tsx      # Maps drawer UI
├── types/
│   └── google-maps.d.ts        # TypeScript declarations
└── ...
```

## Support

For issues:
1. Check Google Cloud Console for API errors
2. Verify environment variables are set
3. Review browser console for JavaScript errors
4. Check API quotas and billing

The Maps integration is now ready to use! Click the "Maps" button in your Aura AI Tools sidebar to get started.