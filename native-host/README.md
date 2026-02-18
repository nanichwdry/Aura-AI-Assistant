# Aura Native Host - Voice-Enabled Extensions

Native messaging host that enables voice responses in Chrome/VS Code extensions.

## Installation

### 1. Install Native Host

```bash
cd native-host
install.bat
```

This will:
- Install dependencies
- Register with Chrome
- Create config file

### 2. Configure API Key

Edit `config.json`:
```json
{
  "geminiApiKey": "your_actual_gemini_api_key"
}
```

### 3. Install Chrome Extension

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Load unpacked: `extensions/aura-reader`
4. Copy the Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 4. Update Native Host Manifest

Edit `com.aura.native_host.json`:
```json
{
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID_HERE/"
  ]
}
```

## Usage

1. Select text on any webpage
2. Press `Alt+Shift+E`
3. Click "✨ Explain"
4. Aura speaks the answer!

## How It Works

```
Chrome Extension → Native Messaging → Node.js Host → Gemini API → Windows TTS
```

- Extension captures selected text
- Sends to native host via Chrome Native Messaging
- Host calls Gemini API for answer
- Speaks response using Windows Speech Synthesis
- Returns text to extension

## Troubleshooting

**"Native host not installed" error:**
- Run `install.bat` again
- Check `config.json` has valid API key
- Verify extension ID in manifest

**No voice output:**
- Check Windows audio settings
- Test: `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('test')"`

**Extension not working:**
- Refresh the webpage
- Check extension is enabled
- Look at `chrome://extensions` errors

## Production Deployment

Users install:
1. Native host (one-time setup via installer)
2. Chrome extension from Web Store
3. Configure API key

No backend server needed for voice!
