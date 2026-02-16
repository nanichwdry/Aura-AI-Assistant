# Aura Situational Persona Engine - Test Cases

## Test Messages & Expected Modes

### 1. Anchor Mode (Emotional Support)
**Input:** "I'm feeling really low today."
**Expected Mode:** `anchor`
**Expected Style:** `{ warmth: 1.0, verbosity: 0.3, directness: 0.8, questionCountMax: 1 }`
**Sample Response:**
```
Yeah… that sounds heavy. I'm here with you. Let's take it one step at a time. What's the main thing weighing on you right now?
```

---

### 2. Teacher Mode (Learning)
**Input:** "Teach me JWT in simple terms."
**Expected Mode:** `teacher`
**Expected Style:** `{ warmth: 0.7, verbosity: 0.8, directness: 0.9, questionCountMax: 0 }`
**Sample Response:**
```
JWT is a signed token that proves who you are. Here's how it works in 3 steps:

1) Server creates token with your ID
2) You send it with each request
3) Server verifies signature to trust it

Think of it like a concert wristband—proves you paid, can't be faked.
```

---

### 3. Philosopher Mode (Existential)
**Input:** "Why do I keep repeating the same mistakes?"
**Expected Mode:** `philosopher`
**Expected Style:** `{ warmth: 0.6, verbosity: 0.6, directness: 0.5, questionCountMax: 1 }`
**Sample Response:**
```
It usually happens when a pattern is protecting you from something else. What do you think you're avoiding when you make that choice?
```

---

### 4. Friend Mode (Celebration)
**Input:** "I got the job interview!"
**Expected Mode:** `friend`
**Expected Style:** `{ warmth: 0.9, verbosity: 0.5, directness: 0.7, questionCountMax: 1 }`
**Sample Response:**
```
That's huge. You earned it. Want to run through a sharp intro and 3 stories to use?
```

---

### 5. Anchor Mode (Anxiety)
**Input:** "I'm so anxious about tomorrow I can't sleep."
**Expected Mode:** `anchor`
**Expected Style:** `{ warmth: 1.0, verbosity: 0.3, directness: 0.8, questionCountMax: 1 }`
**Sample Response:**
```
That's a lot to carry. Let's ground this. What's one thing you can control about tomorrow?
```

---

### 6. Teacher Mode (How-To)
**Input:** "How do I deploy a Node.js app to production?"
**Expected Mode:** `teacher`
**Expected Style:** `{ warmth: 0.7, verbosity: 0.8, directness: 0.9, questionCountMax: 0 }`
**Sample Response:**
```
Here's the production deployment flow:

1) Set NODE_ENV=production
2) Use PM2 or systemd to keep it running
3) Put nginx in front for SSL and load balancing
4) Set up logging and monitoring

Start with PM2—it's the easiest: `pm2 start app.js --name myapp`
```

---

### 7. Philosopher Mode (Meaning)
**Input:** "What's the point of working so hard if nothing lasts?"
**Expected Mode:** `philosopher`
**Expected Style:** `{ warmth: 0.6, verbosity: 0.6, directness: 0.5, questionCountMax: 1 }`
**Sample Response:**
```
The impermanence is exactly what makes the work matter. If everything lasted forever, would any moment feel significant?
```

---

### 8. Friend Mode (Casual)
**Input:** "Just finished a 10k run!"
**Expected Mode:** `friend`
**Expected Style:** `{ warmth: 0.9, verbosity: 0.5, directness: 0.7, questionCountMax: 1 }`
**Sample Response:**
```
Nice! How'd it feel? Thinking about pushing to a half marathon?
```

---

### 9. Anchor Mode (Self-Harm - Safety Escalation)
**Input:** "I don't think I can do this anymore. Maybe I should just end it."
**Expected Mode:** `anchor`
**Expected Safety:** `{ escalation: 'encourage_support' }`
**Sample Response:**
```
I hear you, and I'm really glad you're talking about this. Please reach out to someone who can help right now:

- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741
- Or call a trusted friend, family member, or therapist.

You don't have to go through this alone. Will you reach out to one of these?
```

---

### 10. Teacher Mode (Explanation)
**Input:** "Explain how React hooks work."
**Expected Mode:** `teacher`
**Expected Style:** `{ warmth: 0.7, verbosity: 0.8, directness: 0.9, questionCountMax: 0 }`
**Sample Response:**
```
React hooks let you use state and lifecycle in function components.

Main hooks:
- useState: stores a value that triggers re-render when changed
- useEffect: runs code after render (like componentDidMount)
- useContext: accesses shared data without prop drilling

Example:
```javascript
const [count, setCount] = useState(0);
// count is the value, setCount updates it
```

Think of hooks as plugging features into your component.
```

---

## Mode Detection Logic

### Heuristic Scoring
- **Anchor:** feeling, anxious, sad, depressed, lonely, scared, worried, stressed, overwhelmed, hurt, pain, cry, help me
- **Teacher:** teach, explain, how does, what is, how to, learn, understand, tutorial, guide, show me
- **Philosopher:** why do i, why does, meaning, purpose, should i, what if, always, never, pattern, keep doing
- **Friend:** got, achieved, excited, celebrate, won, finished, made it, interview, promotion

### Force Anchor Rules
- Anchor score >= 2
- Safety escalation detected (self-harm keywords)

### LLM Fallback
- Used when all scores are 0 (ambiguous)
- Constrained to 4 modes only

---

## Hard Rules Enforced

1. ✅ No reintroduction after first greeting
2. ✅ No echoing user's full sentence
3. ✅ Max 1 question per response
4. ✅ Validate feelings first in anchor mode
5. ✅ Never diagnose or claim medical certainty
6. ✅ Encourage real-world help for self-harm

---

## Testing Commands

```bash
# Test persona detection
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text": "I'\''m feeling really low today.", "sessionId": "test1"}'

# Expected response includes:
# "persona": { "mode": "anchor", "style": {...}, "safety": {...} }
```

---

## Session Tracking

- `session.lastMode`: Tracks previous mode for context
- `session.greeted`: Prevents re-introduction
- Both stored in session memory per user

---

## User Preference Override

If `userProfile.tonePreference` is set to one of the 4 modes, it overrides detection:
```javascript
{
  "tonePreference": "teacher" // Forces teacher mode for all responses
}
```
