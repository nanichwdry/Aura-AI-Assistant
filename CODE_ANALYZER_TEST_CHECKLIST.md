# Code Analyzer Test Checklist

## Manual Test Cases

### 1. Valid Code Analysis
**Steps:**
1. Open Code Analyzer drawer
2. Paste valid React/TypeScript code
3. Click "Analyze"

**Expected:**
- Loading spinner appears
- Results render in Issues tab
- Summary shows risk level
- Issues list with severity badges
- No errors

**Test Code:**
```tsx
function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  return <div>{data}</div>;
}
```

---

### 2. Invalid JSON Response Case
**Steps:**
1. Temporarily modify backend to return malformed JSON
2. Paste code and click "Analyze"

**Expected:**
- Error message: "Model returned invalid JSON"
- "Show raw model output" expander visible
- Click expander shows truncated raw output
- No crash, UI remains functional

---

### 3. Backend Down
**Steps:**
1. Stop backend server (Ctrl+C on `npm start`)
2. Paste code and click "Analyze"

**Expected:**
- Error message displayed
- No infinite loading
- UI remains responsive
- Can close drawer

---

### 4. Large Payload (413)
**Steps:**
1. Paste code > 80,000 characters
2. Click "Analyze"

**Expected:**
- Error: "Code too large (max 80k chars)"
- Fast response (no API call made)
- No crash

**Test Code:**
Generate with: `console.log('x'.repeat(81000))`

---

### 5. Apply Patch Success
**Steps:**
1. Paste code with issues
2. Click "Fix"
3. Wait for results
4. Switch to "Patch" tab
5. Click "Apply Patch"

**Expected:**
- Code editor updates with fixed code
- Results panel clears
- No error
- Can re-analyze new code

---

### 6. Apply Patch Failure (Empty Patch)
**Steps:**
1. Manually create result with empty patch but non-empty final_files
2. Click "Apply Patch"

**Expected:**
- Graceful handling
- Either applies final_files OR shows error
- No crash

---

### 7. CORS Check
**Steps:**
1. Open browser DevTools Network tab
2. Run analysis
3. Check `/api/code/analyze` request

**Expected:**
- Status 200 (or appropriate error code)
- Response headers include CORS headers
- No CORS errors in console

---

### 8. Rate Limiting
**Steps:**
1. Click "Analyze" rapidly 3 times

**Expected:**
- First request succeeds
- Second request within 2s shows: "Rate limit: wait 2s between requests"
- Third request after 2s succeeds

---

### 9. Severity Badge Rendering
**Steps:**
1. Analyze code that produces low/medium/high severity issues

**Expected:**
- Low: Yellow badge
- Medium: Orange badge
- High: Red badge
- Badges render correctly in Issues tab

---

### 10. Code Editor Quality Check
**Steps:**
1. Use Code Editor tool (not Analyzer) from main app
2. Submit: "Create a React component that fetches user data"

**Expected:**
- Returns code with:
  - Proper error handling (response.ok check)
  - AbortController for cleanup
  - No "assume sanitized" comments
  - Dependency array in useEffect
  - Loading/error states

---

## Backend Logging Verification

**Check server console for:**
- `[TIMESTAMP] Analysis success: X issues found`
- `[TIMESTAMP] Fix success: X issues, Y patches`
- On error: `[TIMESTAMP] JSON parse failed: ...`
- On error: `[TIMESTAMP] Raw output (first 500 chars): ...`

---

## Edge Cases

### Empty Code
- Analyze button disabled when textarea empty
- No API call made

### Network Timeout
- If API takes >30s, should show error
- UI doesn't freeze

### Multiple Tabs
- Switching tabs while loading doesn't break state
- Results persist when switching tabs

### Copy to Clipboard
- Copy buttons work in Patch and Final tabs
- No alert spam (removed alerts)

---

## Regression Tests

### Existing Tools Still Work
- Weather, News, Wikipedia, etc. unaffected
- Voice chat still functional
- Memory system intact
- PC control routes unchanged

---

## Performance

- Analysis of 1000-line file completes in <10s
- UI remains responsive during analysis
- No memory leaks (check DevTools Memory tab)

---

## Security

- OPENAI_API_KEY never exposed to frontend
- All API calls go through backend
- Rate limiting prevents abuse
- Input size limit enforced (80k chars)
