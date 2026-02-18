# Aura Assistant - VS Code Extension

AI-powered code helper using Aura Assistant.

## Features

- **Explain Selection**: Get AI explanations for selected code
- **Fix Terminal Errors**: Paste terminal output and get fixes
- **Explain Diagnostics**: Understand and fix code issues
- **Context-Aware**: Includes 20 lines before/after cursor
- **Preview Before Send**: Confirmation modal shows what will be sent

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Run `Extensions: Install from VSIX...`
4. Or manually:
   - Copy `extensions/aura-vscode` to `~/.vscode/extensions/`
   - Run `npm install` and `npm run compile` in the folder
   - Reload VS Code

## Commands

- `Aura: Explain Selection` - Explain selected code (`Ctrl+Alt+E` / `Cmd+Alt+E`)
- `Aura: Fix From Terminal` - Fix terminal errors
- `Aura: Explain Diagnostics` - Explain code diagnostics

## Usage

### Explain Selection
1. Select code in the editor
2. Press `Ctrl+Alt+E` or run command
3. Review preview and confirm
4. Enter your question
5. View response in Output panel

### Fix Terminal Errors
1. Copy error from terminal
2. Run `Aura: Fix From Terminal`
3. Paste error output
4. Get fix suggestions

### Explain Diagnostics
1. Open file with errors/warnings
2. Run `Aura: Explain Diagnostics`
3. Get explanations and fixes

## Configuration

Set backend URL in VS Code settings:

```json
{
  "aura.backendUrl": "https://aura-ai-assistant.onrender.com"
}
```

## Payload Limits

- Selection text: 6,000 characters
- Context snippet: 6,000 characters
- Terminal output: 8,000 characters
- Diagnostics: First 10 issues

## Output

Responses appear in the "Aura" output channel. Access via:
- View → Output → Select "Aura"

## Security

- Confirmation required before sending
- Only sends selected code + context
- Never sends entire workspace
- Configurable backend URL
