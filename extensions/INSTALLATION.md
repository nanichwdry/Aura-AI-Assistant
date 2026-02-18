# Aura Screen-Aware Assistant - Installation & Testing Guide

## 📦 What Was Built

1. **Backend Tools** (Node.js/Express)
   - `server/tools/page_explain.js` - Explains web content
   - `server/tools/vscode_help.js` - Helps with code issues
   - Both integrated into `/api/tools/run` endpoint

2. **Chrome Extension** (Manifest V3)
   - Captures selected text + context from webpages
   - Hotkey: Alt+Shift+E
   - Preview modal before sending

3. **VS Code Extension** (TypeScript)
   - Explains code, diagnostics, terminal errors
   - Commands: Explain Selection, Fix Terminal, Explain Diagnostics
   - Hotkey: Ctrl+Alt+E (Cmd+Alt+E on Mac)

---

## 🚀 Installation Steps

### 1. Backend (Already Deployed)
Your backend is live at: `https://aura-ai-assistant.onrender.com`

Test it:
```bash
cd extensions
node test-backend.js
```

Expected output:
```
✅ Backend is healthy!
✅ page_explain works!
✅ vscode_help works!
```

---

### 2. Chrome Extension

**Step 1: Create Icons**
Chrome requires actual PNG icons. Create them or use online tools:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

Place in `extensions/aura-reader/`

**Step 2: Load Extension**
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select folder: `extensions/aura-reader`

**Step 3: Test**
1. Open `extensions/aura-reader/test.html` in Chrome
2. Select text: "Machine learning is a subset of AI"
3. Press `Alt+Shift+E`
4. Popup should show:
   - Page title and URL
   - Selected text
   - Context (full paragraph)
5. Enter question: "Explain this"
6. Click "Explain"
7. Should get AI response

**Troubleshooting:**
- Check console (F12) for errors
- Verify content.js is injected (DevTools → Sources)
- Test backend: `https://aura-ai-assistant.onrender.com/api/health`

---

### 3. VS Code Extension

**Step 1: Install Dependencies**
```bash
cd extensions/aura-vscode
npm install
npm run compile
```

**Step 2: Load Extension**

**Option A: Development Mode**
1. Open VS Code
2. Press F5 (opens Extension Development Host)
3. In new window, open any code file
4. Select code and press `Ctrl+Alt+E`

**Option B: Install Locally**
```bash
# Copy to extensions folder
cp -r extensions/aura-vscode ~/.vscode/extensions/aura-vscode-1.0.0

# Or on Windows
xcopy extensions\aura-vscode %USERPROFILE%\.vscode\extensions\aura-vscode-1.0.0\ /E /I

# Reload VS Code
```

**Step 3: Test**
1. Open any JavaScript/TypeScript file
2. Select code: `const sum = (a, b) => a + b;`
3. Press `Ctrl+Alt+E` (or `Cmd+Alt+E` on Mac)
4. Confirm preview modal
5. Enter question: "Explain this code"
6. Check Output panel (View → Output → Select "Aura")

**Test Terminal Fix:**
1. Run command: `Aura: Fix From Terminal`
2. Paste error: `Error: Cannot find module 'express'`
3. Get fix suggestion

---

## 🧪 How to Verify It's Working

### Chrome Extension Debug
```javascript
// Open popup, then in DevTools console:
chrome.storage.local.get(['lastBundle', 'backendUrl'], (data) => {
  console.log('Last bundle:', data.lastBundle);
  console.log('Backend URL:', data.backendUrl);
});
```

### VS Code Extension Debug
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `Developer: Show Running Extensions`
3. Find "Aura Assistant"
4. Click "Activate" if not active

### Backend Debug
```bash
# Test page_explain
curl -X POST https://aura-ai-assistant.onrender.com/api/tools/run \
  -H "Content-Type: application/json" \
  -d '{"tool":"page_explain","input":{"question":"What is this?","selectionText":"AI is amazing"}}'

# Test vscode_help
curl -X POST https://aura-ai-assistant.onrender.com/api/tools/run \
  -H "Content-Type: application/json" \
  -d '{"tool":"vscode_help","input":{"question":"Explain","selectionText":"const x = 5;"}}'
```

---

## 📝 Files Created

### Backend
- `server/tools/page_explain.js`
- `server/tools/vscode_help.js`
- `server/index.js` (updated CORS + tool routes)

### Chrome Extension
- `extensions/aura-reader/manifest.json`
- `extensions/aura-reader/background.js`
- `extensions/aura-reader/content.js`
- `extensions/aura-reader/popup.html`
- `extensions/aura-reader/popup.js`
- `extensions/aura-reader/popup.css`
- `extensions/aura-reader/test.html`
- `extensions/aura-reader/README.md`

### VS Code Extension
- `extensions/aura-vscode/package.json`
- `extensions/aura-vscode/tsconfig.json`
- `extensions/aura-vscode/src/extension.ts`
- `extensions/aura-vscode/README.md`

### Testing
- `extensions/test-backend.js`

---

## 🔧 Configuration

### Chrome Extension
Click ⚙️ Settings in popup to change backend URL.

### VS Code Extension
Add to `settings.json`:
```json
{
  "aura.backendUrl": "https://aura-ai-assistant.onrender.com"
}
```

---

## ❓ Common Issues

**"Extension not loading"**
- Add PNG icons (required by Chrome)
- Check manifest.json syntax

**"No response from backend"**
- Test: `https://aura-ai-assistant.onrender.com/api/health`
- Check CORS (should allow chrome-extension://)
- Verify OPENAI_API_KEY is set

**"VS Code command not found"**
- Run `npm run compile` in extension folder
- Reload VS Code window
- Check Extension Development Host

**"Context not captured"**
- Chrome: Select text inside `<p>`, `<div>`, or `<article>`
- VS Code: Make sure file is open and has content

---

## 🎯 Next Steps

1. Test backend: `node extensions/test-backend.js`
2. Load Chrome extension and test with `test.html`
3. Compile and load VS Code extension
4. Try all commands and verify responses
5. Check Output/Console for errors

If still not working, share the specific error message!
