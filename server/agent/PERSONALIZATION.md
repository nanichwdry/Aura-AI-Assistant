# Aura Personalization System

Long-term personalization and persistent intelligence for adaptive recommendations.

## Architecture

```
User Actions → Preference Engine → Profile Storage → Personalized Responses
                                 ↓
                          Proactive Engine → Suggestions
```

## Database Schema

### user_profiles
```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  home_location TEXT,
  preferred_airports TEXT,      -- JSON array
  budget_range TEXT,             -- JSON object {min, max}
  favorite_brands TEXT,          -- JSON array
  frequent_cities TEXT,          -- JSON array
  tone_preference TEXT,          -- 'professional', 'casual', 'friendly'
  notification_prefs TEXT,       -- JSON object
  created_at DATETIME,
  updated_at DATETIME
);
```

### user_actions
```sql
CREATE TABLE user_actions (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  action_type TEXT,              -- 'route_search', 'deal_view', 'purchase', etc.
  action_data TEXT,              -- JSON object
  created_at DATETIME
);
```

## Components

### 1. Preference Engine (`preference_engine.js`)

**Functions:**
- `getProfile(userId)` - Retrieve user profile
- `updateProfile(userId, updates)` - Update profile fields
- `logAction(userId, actionType, actionData)` - Log user action
- `getRecentActions(userId, limit)` - Get recent actions
- `inferPreferences(userId)` - Analyze patterns and infer preferences
- `applyPersonalization(userId, toolName, input, result)` - Apply personalization to results

**Learning Logic:**
- Tracks frequent routes from route_search actions
- Calculates budget patterns from purchase/deal_view actions
- Identifies search patterns across all tools

### 2. Proactive Engine (`proactive_engine.js`)

**Functions:**
- `generateProactiveSuggestions(userId)` - Generate contextual suggestions
- `checkDailyProactive(userId)` - Daily proactive check

**Suggestion Types:**
- Traffic alerts for frequent routes
- Price drop notifications for recent searches
- Weather updates for home location
- Route reminders for frequent trips

**Relevance Scoring:**
- 0.0-1.0 scale
- Based on recency, frequency, and user context
- Top 3 suggestions returned

## API Endpoints

### Get Profile
```bash
GET /api/personalization/profile/:userId
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "homeLocation": "Washington DC",
    "preferredAirports": ["DCA", "IAD"],
    "budgetRange": {"min": 100, "max": 500},
    "favoriteBrands": ["Hilton", "Marriott"],
    "frequentCities": ["NYC", "Boston"],
    "tonePreference": "professional",
    "notificationPrefs": {"email": true, "push": false}
  }
}
```

### Update Profile
```bash
POST /api/personalization/profile/:userId
{
  "homeLocation": "Washington DC",
  "budgetRange": {"min": 100, "max": 500}
}
```

### Get Recent Actions
```bash
GET /api/personalization/actions/:userId?limit=20
```

### Get Inferred Preferences
```bash
GET /api/personalization/preferences/:userId
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "frequentRoutes": ["DC-NYC", "DC-Boston"],
    "budgetPatterns": {"avg": 250, "max": 500},
    "searchPatterns": []
  }
}
```

### Get Proactive Suggestions
```bash
GET /api/personalization/suggestions/:userId
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "type": "price_drop",
      "message": "Check for price drops on your recent searches",
      "relevanceScore": 0.7,
      "action": {"tool": "deal_finder", "input": {"query": "laptop"}}
    },
    {
      "type": "route_reminder",
      "message": "Plan your trip from DC to NYC?",
      "relevanceScore": 0.65,
      "action": {"tool": "route_planner", "input": {"origin": "DC", "destination": "NYC"}}
    }
  ]
}
```

### Reset Memory
```bash
POST /api/personalization/reset/:userId
```

**Response:**
```json
{
  "success": true,
  "message": "Memory reset successfully"
}
```

### Transparency View
```bash
GET /api/personalization/transparency/:userId
```

**Response:**
```json
{
  "success": true,
  "explanation": {
    "dataCollected": {
      "profileFields": ["homeLocation", "budgetRange"],
      "actionCount": 45,
      "actionTypes": ["route_search", "deal_view", "weather_use"]
    },
    "inferredPatterns": {
      "frequentRoutes": ["DC-NYC"],
      "budgetPatterns": {"avg": 250}
    },
    "howWeUseIt": [
      "Suggest relevant routes based on your frequent searches",
      "Recommend deals within your typical budget range"
    ],
    "yourRights": [
      "View all collected data",
      "Reset memory at any time"
    ]
  }
}
```

## Personalized Response Format

All agent responses include personalization metadata:

```json
{
  "success": true,
  "type": "action",
  "goal": "Plan route to NYC",
  "stepsExecuted": [...],
  "finalRecommendation": {...},
  "reasoningSummary": "...",
  "confidence": 0.85,
  "personalizationApplied": true,
  "basedOn": ["frequent_routes", "budget_preference"],
  "personalizationMessage": "You frequently travel this route: DC-NYC"
}
```

## Ethical Guidelines

### Privacy
- Never infer sensitive attributes (race, religion, health)
- Store only explicitly provided or behaviorally observed data
- No third-party data sharing

### Transparency
- Full transparency view available
- Explain why personalization is applied
- "Why am I seeing this?" explanation in all responses

### User Control
- Memory reset available anytime
- Manual profile updates supported
- Opt-out of personalization possible

### Data Minimization
- Store only necessary data
- Automatic cleanup of old actions (optional)
- No permanent deletion prevention

## Usage Examples

### Example 1: Route Planning with Personalization

**Request:**
```bash
POST /api/chat
{
  "text": "Plan route to NYC",
  "userId": "user123",
  "sessionId": "session456"
}
```

**Response:**
```json
{
  "success": true,
  "type": "action",
  "goal": "Plan route to NYC",
  "finalRecommendation": {
    "summary": "Route from DC to NYC: 4h drive, $50 gas",
    "confidence": 0.9
  },
  "personalizationApplied": true,
  "basedOn": ["frequent_routes"],
  "personalizationMessage": "You frequently travel this route: DC-NYC"
}
```

### Example 2: Deal Finder with Budget Awareness

**Request:**
```bash
POST /api/chat
{
  "text": "Find laptop deals",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "type": "information",
  "finalRecommendation": {
    "summary": "Found 2 laptops in your typical price range ($200-$400)"
  },
  "personalizationApplied": true,
  "basedOn": ["budget_preference"],
  "personalizationMessage": "Based on your history, you typically spend around $300"
}
```

### Example 3: Proactive Morning Suggestions

**Request:**
```bash
GET /api/personalization/daily/user123
```

**Response:**
```json
{
  "success": true,
  "daily": {
    "timestamp": "2024-01-15T08:00:00Z",
    "suggestions": [
      {
        "type": "weather_update",
        "message": "Today's weather in Washington DC",
        "relevanceScore": 0.5
      },
      {
        "type": "traffic_alert",
        "message": "Check traffic conditions for your frequent routes",
        "relevanceScore": 0.6
      }
    ],
    "count": 2
  }
}
```

## Testing

```bash
# Create profile
curl -X POST http://localhost:3001/api/personalization/profile/test_user \
  -H "Content-Type: application/json" \
  -d '{"homeLocation": "Washington DC", "budgetRange": {"min": 100, "max": 500}}'

# Get suggestions
curl http://localhost:3001/api/personalization/suggestions/test_user

# View transparency
curl http://localhost:3001/api/personalization/transparency/test_user

# Reset memory
curl -X POST http://localhost:3001/api/personalization/reset/test_user
```

## Future Enhancements

- Machine learning for better preference inference
- Collaborative filtering for recommendations
- Time-based pattern recognition
- Multi-device profile sync
- Export personal data (GDPR compliance)
