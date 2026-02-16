# Code Analyzer - Quick Start Testing Guide

## Prerequisites
- Backend running on port 3001: `cd server && npm start`
- Frontend running on port 5173: `npm run dev`
- OPENAI_API_KEY set in `server/.env`

---

## 1. Basic Smoke Test (2 minutes)

### Step 1: Open Code Analyzer
1. Open http://localhost:5173
2. Click "Code Analyzer" tool in sidebar
3. Drawer opens with split-pane layout

### Step 2: Analyze Code
Paste this code:
```tsx
function App() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  return <div>{data}</div>;
}
```

Click "Analyze"

**Expected:**
- Loading spinner with "Analyzing code..." text
- After 3-5 seconds: Results appear
- Issues tab shows problems (missing error handling, no abort controller, etc.)
- Summary shows risk level badge (likely "medium" or "high")

### Step 3: View Patches
1. Click "Patch" tab
2. See unified diff with fixes
3. Click "Apply Patch" button
4. Code editor updates with fixed code

**Expected:**
- Fixed code includes:
  - `response.ok` check
  - Error state handling
  - AbortController cleanup
  - Proper dependency array

---

## 2. Error Handling Test (1 minute)

### Test Backend Down
1. Stop backend server (Ctrl+C)
2. Try to analyze code
3. Error message appears: "fetch failed" or similar
4. UI remains functional, can close drawer

### Test Rate Limit
1. Restart backend
2. Click "Analyze" rapidly 3 times
3. Second request shows: "Rate limit: wait 2s between requests"

---

## 3. Code Editor Quality Test (2 minutes)

### From Main App (not Code Analyzer drawer)
1. Close Code Analyzer drawer
2. Click "Code Editor" tool in sidebar
3. In input field, type: "Create a React component that fetches user data"
4. Click "Run"

**Expected Output Should Include:**
```tsx
// ✅ Error handling
if (!response.ok) throw new Error('Failed to fetch');

// ✅ AbortController
const controller = new AbortController();
fetch(url, { signal: controller.signal });

// ✅ Cleanup
return () => controller.abort();

// ✅ Loading/error states
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// ❌ Should NOT include:
// "assume input is sanitized"
// "TODO: add error handling"
```

---

## 4. Check Backend Logs

In server terminal, you should see:
```
[1234567890] Analysis success: 5 issues found
[1234567891] Fix success: 5 issues, 1 patches
```

If errors occur:
```
[1234567892] JSON parse failed: Unexpected token
[1234567892] Raw output (first 500 chars): {...truncated output...}
```

---

## 5. Browser DevTools Check

### Network Tab
1. Open DevTools → Network
2. Analyze code
3. Find `/api/code/analyze` request
4. Check response:
   - Status: 200
   - Response body: `{ "ok": true, "data": {...}, "error": null }`
   - CORS headers present

### Console Tab
- No errors (except expected ones during error tests)
- No CORS errors
- No unhandled promise rejections

---

## Common Issues & Fixes

### "Code Analyzer shows blank screen"
**Cause:** Old issue - should be fixed now
**Verify:** Check browser console for errors, check backend logs

### "Model returned invalid JSON"
**Cause:** OpenAI returned non-JSON (rare)
**Verify:** Click "Show raw model output" to see what was returned
**Fix:** Usually transient, retry

### "Rate limit" error
**Expected:** Working as designed
**Fix:** Wait 2 seconds between requests

### "Code too large"
**Expected:** Working as designed (80k char limit)
**Fix:** Reduce code size or split into multiple files

---

## Success Criteria

✅ Code Analyzer always renders something (loading/result/error)
✅ Error messages are actionable and clear
✅ Apply Patch updates code editor correctly
✅ Code Editor returns high-quality fixes (no "assume sanitized")
✅ Backend logs show request IDs and success/failure
✅ No crashes or blank screens
✅ Rate limiting works
✅ CORS headers present

---

## Next Steps

If all tests pass:
1. Test with real-world code from your project
2. Try different languages (Python, JavaScript, etc.)
3. Test edge cases (empty code, very large code, etc.)
4. Monitor backend logs for any warnings

If tests fail:
1. Check `CODE_ANALYZER_FIX_SUMMARY.md` for troubleshooting
2. Verify OPENAI_API_KEY is set correctly
3. Check backend and frontend are both running
4. Review browser console and backend logs for errors
