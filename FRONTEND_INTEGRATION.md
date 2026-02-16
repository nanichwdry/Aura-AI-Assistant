# Frontend Integration Guide

## Authentication Required

All personalization endpoints now require Bearer token authentication.

## Getting Device Token

Device token is obtained during pairing flow (already implemented in your system).

## Making Authenticated Requests

### Example: Get Profile
```javascript
const deviceToken = localStorage.getItem('deviceToken'); // or from your auth state

fetch('/api/personalization/profile', {
  headers: {
    'Authorization': `Bearer ${deviceToken}`
  }
})
.then(res => res.json())
.then(data => console.log(data.profile));
```

### Example: Update Profile
```javascript
fetch('/api/personalization/profile', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${deviceToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    homeLocation: 'Washington DC',
    budgetRange: { min: 100, max: 500 }
  })
});
```

### Example: Get Suggestions
```javascript
fetch('/api/personalization/suggestions', {
  headers: {
    'Authorization': `Bearer ${deviceToken}`
  }
})
.then(res => res.json())
.then(data => {
  data.suggestions.forEach(s => {
    console.log(s.message, s.relevanceScore);
  });
});
```

### Example: Dismiss Suggestion
```javascript
fetch('/api/personalization/suggestions/weather_update/dismiss', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${deviceToken}`
  }
});
```

### Example: Reset Memory
```javascript
fetch('/api/personalization/reset', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${deviceToken}`
  }
})
.then(res => res.json())
.then(data => console.log(data.message));
```

## Error Handling

### 401 Unauthorized
```javascript
fetch('/api/personalization/profile', {
  headers: { 'Authorization': `Bearer ${deviceToken}` }
})
.then(res => {
  if (res.status === 401) {
    // Token invalid or expired - redirect to login/pairing
    window.location.href = '/pair';
  }
  return res.json();
});
```

### 403 Forbidden
```javascript
// Admin endpoints only
fetch('/api/personalization/admin/cleanup', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
})
.then(res => {
  if (res.status === 403) {
    console.error('Admin access required');
  }
  return res.json();
});
```

## React Hook Example

```javascript
import { useState, useEffect } from 'react';

function usePersonalization() {
  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const deviceToken = localStorage.getItem('deviceToken');
  
  const headers = {
    'Authorization': `Bearer ${deviceToken}`
  };
  
  useEffect(() => {
    // Load profile
    fetch('/api/personalization/profile', { headers })
      .then(res => res.json())
      .then(data => setProfile(data.profile));
    
    // Load suggestions
    fetch('/api/personalization/suggestions', { headers })
      .then(res => res.json())
      .then(data => setSuggestions(data.suggestions));
  }, []);
  
  const updateProfile = async (updates) => {
    const res = await fetch('/api/personalization/profile', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  };
  
  const dismissSuggestion = async (type) => {
    await fetch(`/api/personalization/suggestions/${type}/dismiss`, {
      method: 'POST',
      headers
    });
    setSuggestions(suggestions.filter(s => s.type !== type));
  };
  
  const resetMemory = async () => {
    const res = await fetch('/api/personalization/reset', {
      method: 'POST',
      headers
    });
    setProfile(null);
    setSuggestions([]);
    return res.json();
  };
  
  return {
    profile,
    suggestions,
    updateProfile,
    dismissSuggestion,
    resetMemory
  };
}

export default usePersonalization;
```

## Usage in Component

```javascript
function ProfileSettings() {
  const { profile, updateProfile } = usePersonalization();
  
  const handleSave = () => {
    updateProfile({
      homeLocation: 'New York',
      budgetRange: { min: 200, max: 800 }
    });
  };
  
  return (
    <div>
      <h2>Profile Settings</h2>
      <p>Home: {profile?.homeLocation || 'Not set'}</p>
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

## Proactive Suggestions UI

```javascript
function SuggestionCard({ suggestion, onDismiss, onAccept }) {
  return (
    <div className="suggestion-card">
      <p>{suggestion.message}</p>
      <span>Relevance: {(suggestion.relevanceScore * 100).toFixed(0)}%</span>
      <button onClick={() => onAccept(suggestion)}>Accept</button>
      <button onClick={() => onDismiss(suggestion.type)}>Dismiss</button>
    </div>
  );
}

function SuggestionsList() {
  const { suggestions, dismissSuggestion } = usePersonalization();
  
  const handleAccept = (suggestion) => {
    // Execute the suggested action
    fetch(`/api/tools/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: suggestion.action.tool,
        input: suggestion.action.input
      })
    });
  };
  
  return (
    <div>
      {suggestions.map(s => (
        <SuggestionCard
          key={s.type}
          suggestion={s}
          onDismiss={dismissSuggestion}
          onAccept={handleAccept}
        />
      ))}
    </div>
  );
}
```

## Transparency View

```javascript
function TransparencyView() {
  const [transparency, setTransparency] = useState(null);
  const deviceToken = localStorage.getItem('deviceToken');
  
  useEffect(() => {
    fetch('/api/personalization/transparency', {
      headers: { 'Authorization': `Bearer ${deviceToken}` }
    })
    .then(res => res.json())
    .then(data => setTransparency(data.explanation));
  }, []);
  
  if (!transparency) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Your Data</h2>
      
      <section>
        <h3>Data Collected</h3>
        <p>Profile fields: {transparency.dataCollected.profileFields.join(', ')}</p>
        <p>Actions logged: {transparency.dataCollected.actionCount}</p>
        <p>Action types: {transparency.dataCollected.actionTypes.join(', ')}</p>
      </section>
      
      <section>
        <h3>Inferred Patterns</h3>
        <pre>{JSON.stringify(transparency.inferredPatterns, null, 2)}</pre>
      </section>
      
      <section>
        <h3>How We Use It</h3>
        <ul>
          {transparency.howWeUseIt.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>
      
      <section>
        <h3>Your Rights</h3>
        <ul>
          {transparency.yourRights.map((right, i) => (
            <li key={i}>{right}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

## Important Notes

1. **Store device token securely** - Use localStorage or secure cookie
2. **Handle 401 errors** - Redirect to pairing flow
3. **Show loading states** - Personalization calls may take time
4. **Respect user privacy** - Always show transparency view
5. **Allow memory reset** - Provide clear reset button

## Testing

```javascript
// Test with curl
curl -H "Authorization: Bearer YOUR_DEVICE_TOKEN" \
  http://localhost:3001/api/personalization/profile

// Should return profile data or 401 if token invalid
```
