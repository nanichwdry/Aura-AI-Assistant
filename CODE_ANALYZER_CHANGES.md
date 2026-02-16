# Code Analyzer - Exact Changes Reference

## File 1: server/routes/code.js

### Change 1: System Prompt (Lines 9-26)
**BEFORE:**
```javascript
const SYSTEM_PROMPT = `You are a code analyzer. Return ONLY valid JSON with this exact structure:
{
  "summary": { "risk_level": "low|medium|high", ... },
  "issues": [ { "severity": "info|warning|error|critical", ... } ],
  ...
}
Rules:
- Minimal diffs only
- No logic rewrites unless critical
...`;
```

**AFTER:**
```javascript
const SYSTEM_PROMPT = `You are Aura Code Analyzer & Code Editor.
Rules:
1) Minimal diffs only. Preserve structure and names.
2) Do NOT add dependencies unless explicitly allowed.
3) Do NOT say "assume sanitized" or similar. Either render as text safely OR propose a concrete sanitization plan.
4) For React fetch/useEffect: must handle dependency arrays, abort controller, response.ok, error state, and stale updates.
5) Memoization is not a fix for an absurdly expensive operation; call that out and remove/replace it.
Output JSON only, exactly:
{
  "summary": { "risk_level": "low|medium|high", ... },
  "issues": [ { "severity": "low|medium|high", ... } ],
  ...
}
No extra keys. No markdown. No commentary.`;
```

### Change 2: /analyze Endpoint (Lines 28-75)
**KEY CHANGES:**
- Added `requestId` for tracking
- Changed error responses from `res.status(400).json({ error })` to `res.json({ ok: false, error: { message }, data: null })`
- Added try-catch around `JSON.parse()` with logging
- Added schema validation for required keys
- Added `raw_model_output` in error responses
- Changed success response to `res.json({ ok: true, data: result, error: null })`

### Change 3: /fix Endpoint (Lines 77-124)
**SAME CHANGES AS /analyze** plus:
- Added warning log if patches empty but final_files present

---

## File 2: src/services/codeApi.ts

### Change 1: Added ApiResponse Interface (Lines 33-38)
```typescript
interface ApiResponse {
  ok: boolean;
  data: CodeAnalysisResponse | null;
  error: { message: string; details?: string } | null;
  raw_model_output?: string;
}
```

### Change 2: analyzeCode Function (Lines 40-52)
**BEFORE:**
```typescript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error || 'Analysis failed');
}
return response.json();
```

**AFTER:**
```typescript
const apiResponse: ApiResponse = await response.json();

if (!apiResponse.ok || !apiResponse.data) {
  const errorMsg = apiResponse.error?.message || 'Analysis failed';
  const errorDetails = apiResponse.error?.details ? ` (${apiResponse.error.details})` : '';
  throw new Error(errorMsg + errorDetails);
}

return apiResponse.data;
```

### Change 3: fixCode Function (Lines 54-66)
**SAME CHANGES AS analyzeCode**

---

## File 3: src/tools/CodeAnalyzerDrawer.tsx

### Change 1: Imports (Line 2)
**ADDED:** `ChevronDown, ChevronUp`

### Change 2: Error State (Line 14)
**BEFORE:**
```typescript
const [error, setError] = useState('');
```

**AFTER:**
```typescript
const [error, setError] = useState<{ message: string; details?: string; raw?: string } | null>(null);
```

### Change 3: Added showRawOutput State (Line 16)
```typescript
const [showRawOutput, setShowRawOutput] = useState(false);
```

### Change 4: handleAnalyze Function (Lines 18-33)
**ADDED:**
```typescript
setError(null);
setResult(null);
```

**CHANGED:**
```typescript
// OLD: setError(err.message);
// NEW:
const errorParts = err.message.split(' (');
setError({ 
  message: errorParts[0], 
  details: errorParts[1]?.replace(')', ''),
  raw: err.raw_model_output 
});
```

### Change 5: handleFix Function (Lines 35-50)
**SAME CHANGES AS handleAnalyze**

### Change 6: handleApplyPatch Function (Lines 52-58)
**ADDED:**
```typescript
setResult(null);
setError(null);
```

**REMOVED:**
```typescript
alert('Patch applied!');
```

### Change 7: copyToClipboard Function (Lines 60-62)
**REMOVED:**
```typescript
alert('Copied!');
```

### Change 8: getSeverityColor Function (Lines 64-71)
**CHANGED:**
```typescript
// OLD: case 'critical': return 'bg-red-500';
//      case 'error': return 'bg-orange-500';
//      case 'warning': return 'bg-yellow-500';

// NEW: 
switch (severity.toLowerCase()) {
  case 'high': return 'bg-red-500';
  case 'medium': return 'bg-orange-500';
  case 'low': return 'bg-yellow-500';
  default: return 'bg-blue-500';
}
```

### Change 9: Loading UI (Lines 107-113)
**ADDED:** Text below spinner
```tsx
<div className="text-center">
  <div className="animate-spin ..."></div>
  <p className="text-sm text-gray-400">Analyzing code...</p>
</div>
```

### Change 10: Error UI (Lines 115-145)
**COMPLETELY REWRITTEN:**
```tsx
{!loading && error && (
  <div className="flex-1 flex items-center justify-center p-6">
    <div className="max-w-md w-full space-y-3">
      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium mb-1">{error.message}</p>
            {error.details && (
              <p className="text-sm opacity-80">{error.details}</p>
            )}
          </div>
        </div>
      </div>
      {error.raw && (
        <div>
          <button onClick={() => setShowRawOutput(!showRawOutput)} ...>
            {showRawOutput ? <ChevronUp /> : <ChevronDown />}
            Show raw model output
          </button>
          {showRawOutput && (
            <pre className="mt-2 p-3 bg-slate-950/50 rounded-lg text-xs text-gray-400 overflow-auto max-h-40">
              {error.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

### Change 11: Issues Tab Empty State (Lines 180-185)
**ADDED:**
```tsx
{result.issues?.length > 0 ? result.issues.map(...) : (
  <div className="p-8 text-center text-gray-500">
    No issues found
  </div>
)}
```

### Change 12: Patch Tab Empty State (Lines 200-205)
**ADDED:**
```tsx
{result.patches?.length > 0 ? result.patches.map(...) : (
  <div className="p-8 text-center text-gray-500">
    No patches generated
  </div>
)}
```

### Change 13: Final Tab Empty State (Lines 220-225)
**ADDED:**
```tsx
{result.final_files?.length > 0 ? result.final_files.map(...) : (
  <div className="p-8 text-center text-gray-500">
    No final files generated
  </div>
)}
```

### Change 14: Added custom-scrollbar Class (Line 151)
```tsx
<div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
```

---

## File 4: server/index.js

### Change 1: Code Editor Prompt (Line ~330)
**BEFORE:**
```javascript
content: 'You are Aura Code Editor, a senior engineer. Return production-ready code only. No explanations unless requested. Use best practices. Secure and modern syntax.'
```

**AFTER:**
```javascript
content: 'You are Aura Code Editor. Rules: 1) Return production-ready code only. 2) No "assume sanitized" - either render as text safely OR propose concrete sanitization. 3) For React: handle response.ok, error state, abort controller, stale updates. 4) Use best practices. 5) Secure and modern syntax. 6) Minimal changes only.'
```

### Change 2: Code Analyzer Prompt (Line ~345)
**BEFORE:**
```javascript
content: 'You are Aura Code Analyzer, a senior software architect. Analyze code and return structured feedback:\n\n## Critical Issues\n## Improvements\n## Refactored Snippet (if needed)\n## Summary\n\nBe precise. No fluff.'
```

**AFTER:**
```javascript
content: 'You are Aura Code Analyzer. Analyze code and return structured feedback:\n\n## Critical Issues\n## Improvements\n## Refactored Snippet (if needed)\n## Summary\n\nBe precise. No fluff. No "assume sanitized" - call out real security issues with concrete fixes.'
```

---

## Summary of Changes

**Backend:**
- ✅ Strict system prompt with React best practices
- ✅ Standardized { ok, data, error } response envelope
- ✅ Request ID tracking and logging
- ✅ JSON parse error handling with raw output
- ✅ Schema validation for required keys
- ✅ Fixed severity values (low/medium/high)

**Frontend:**
- ✅ Rich error state with message/details/raw
- ✅ "Show raw output" expander for debugging
- ✅ State clearing between requests
- ✅ Empty state handling for all tabs
- ✅ Removed alert() spam
- ✅ Loading text for better UX
- ✅ Proper error extraction from API response

**Code Quality:**
- ✅ No "assume sanitized" allowed
- ✅ Enforces concrete security fixes
- ✅ React best practices (abort controller, response.ok, etc.)
- ✅ Minimal diffs only
