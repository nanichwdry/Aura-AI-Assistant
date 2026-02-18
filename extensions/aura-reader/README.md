# Aura Reader - Chrome Extension

AI-powered webpage explainer using Aura Assistant.

## Features

- **Hotkey**: `Alt+Shift+E` to capture selection and open Aura
- **Smart Context**: Automatically captures surrounding paragraph/context
- **Preview Before Send**: See what will be sent to Aura
- **Configurable Backend**: Change backend URL in settings

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extensions/aura-reader` folder
5. Add placeholder icons (icon16.png, icon48.png, icon128.png) or the extension won't load

## Usage

1. Select text on any webpage
2. Press `Alt+Shift+E` or click the extension icon
3. Review the captured text and context
4. Enter your question (default: "Explain this simply")
5. Click "Explain" to get Aura's response

## Configuration

Click the ⚙️ Settings link in the popup to change the backend URL.

Default: `https://aura-ai-assistant.onrender.com`

## Payload Limits

- Selection text: 6,000 characters
- Context text: 6,000 characters
- Total payload: ~12,000 characters

## Security

- Only sends selected text and nearby context
- Never scrapes full pages
- Preview modal before sending
- CORS-enabled for extension origins
