# Aura AI Assistant - Architecture & Layout Documentation

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     AURA AI ASSISTANT                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │  Local Agent │     │
│  │  (React/TS)  │◄─┤  (Express)   │◄─┤   (Node.js)  │     │
│  │  Port: 5173  │  │  Port: 3001  │  │  Port: 8787  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         ▼                  ▼                                │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Gemini API   │  │  SQLite DB   │                        │
│  │ (Voice/Chat) │  │  (Memory)    │                        │
│  └──────────────┘  └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture
```
App.tsx (Root)
│
├─── State Management
│    ├─── Voice Session (Gemini Live API)
│    ├─── Messages (Chat History)
│    ├─── Tool State (Active Drawer, Results)
│    └─── UI State (Theme, Sidebar, Settings)
│
├─── UI Components
│    ├─── TopBar (Logo, Controls)
│    ├─── ChatPanel (Messages, Input)
│    ├─── Sidebar (17 AI Tools)
│    ├─── ToolDrawer (Dynamic Tool UI)
│    └─── Settings Modal
│
└─── Services
     ├─── Gemini AI (Voice + Text)
     ├─── Weather API (OpenWeather)
     ├─── News API (NewsAPI)
     ├─── PC Control (Local Agent)
     └─── Memory API (Backend)
```

---

## 📐 UI Layout Structure

### Desktop Layout (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ [A] Aura          [Mic][Theme][Sound][Settings]  ← Top Bar  │
├─────────────────────────────────────┬───────────────────────┤
│                                     │  🧠 AI Tools          │
│  💬 Chat Messages                   │  ┌────────┬────────┐  │
│  ┌──────────────────────────────┐  │  │Weather │ News   │  │
│  │ User: Hello                  │  │  │☁️      │📰      │  │
│  └──────────────────────────────┘  │  ├────────┼────────┤  │
│                                     │  │Wiki    │ Time   │  │
│  ┌──────────────────────────────┐  │  │📖      │🕐      │  │
│  │ Aura: Hi! How can I help?   │  │  ├────────┼────────┤  │
│  └──────────────────────────────┘  │  │Music   │ Games  │  │
│                                     │  │🎵      │🎮      │  │
│  ┌──────────────────────────────┐  │  ├────────┼────────┤  │
│  │ [📎] Type message... [Send]  │  │  │ ... 11 more ...  │
│  └──────────────────────────────┘  │  └────────┴────────┘  │
│                                     │                       │
└─────────────────────────────────────┴───────────────────────┘
```

### Mobile Layout (<1024px)
```
┌─────────────────────────────────────┐
│ [A] Aura    [Mic][Theme][Sound][⚙️] │
├─────────────────────────────────────┤
│                                     │
│  💬 Chat Messages (Full Width)      │
│  ┌──────────────────────────────┐  │
│  │ User: Hello                  │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Aura: Hi! How can I help?   │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ [📎] Type message... [Send]  │  │
│  └──────────────────────────────┘  │
│                                     │
│                          [☰] ←Float │
└─────────────────────────────────────┘
```

---

## 🎨 Design System

### Color Palette

**Dark Theme (Default)**
```css
Background:     gradient-to-br from-slate-950 via-slate-900 to-slate-950
Cards:          bg-slate-900/50 backdrop-blur-xl
Borders:        border-slate-800/50
Text Primary:   text-gray-100
Text Muted:     text-gray-400
Accent:         gradient-to-r from-indigo-600 to-purple-600
```

**Light Theme**
```css
Background:     gradient-to-br from-gray-50 via-white to-gray-50
Cards:          bg-white/50 backdrop-blur-xl
Borders:        border-gray-200/50
Text Primary:   text-gray-900
Text Muted:     text-gray-600
Accent:         gradient-to-r from-indigo-600 to-purple-600
```

### Typography
```
Font Family:    -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI'
Sizes:
  - Title:      text-3xl (30px)
  - Heading:    text-lg (18px)
  - Body:       text-sm (14px)
  - Small:      text-xs (12px)
```

### Spacing
```
Padding:        p-6 (24px) - Standard
                p-4 (16px) - Compact
                p-2 (8px)  - Tight
Gap:            gap-3 (12px) - Standard
                gap-2 (8px)  - Compact
Border Radius:  rounded-3xl (24px) - Large
                rounded-2xl (16px) - Medium
                rounded-xl (12px)  - Small
```

### Shadows
```
Standard:       shadow-lg
Accent:         shadow-2xl shadow-indigo-500/50
Glow:           shadow-lg shadow-indigo-500/30
```

---

## 🔧 Component Specifications

### 1. Top Bar (64px height)
```tsx
Position:       fixed top-0, z-50
Background:     Glassmorphism card
Border:         Bottom border
Layout:         Flex justify-between

Left Section:
  - Logo (32px gradient square)
  - "Aura" text (gradient)

Right Section:
  - Mic button (gradient when active)
  - Theme toggle
  - Sound toggle
  - Settings button
```

### 2. Chat Panel (flex-1)
```tsx
Layout:         Flex column
Sections:
  - Messages Area (flex-1, overflow-y-auto)
  - Input Bar (fixed bottom)

Message Bubble:
  - User: Right-aligned, gradient bg
  - Assistant: Left-aligned, glass card
  - Max width: 70%
  - Padding: px-4 py-3
  - Border radius: rounded-2xl

Input Bar:
  - Attach button
  - Text input (flex-1)
  - Send button (gradient)
```

### 3. Sidebar (320px width)
```tsx
Display:        hidden lg:block
Background:     Glassmorphism card
Border:         Left border

Header:
  - Brain icon + "AI Tools" text

Grid:
  - 2 columns
  - Gap: 12px
  - 17 tool buttons

Tool Button:
  - Icon (20px)
  - Label (12px)
  - Gradient on hover
  - Rounded-2xl
```

### 4. Tool Drawer (Modal)
```tsx
Position:       fixed inset-0, z-50
Background:     Backdrop blur
Width:          700px (desktop), 100% (mobile)
Max Height:     85vh

Structure:
  - Header (icon + title + close)
  - Content (scrollable results)
  - Input Area (conditional)

Result Types:
  - Weather: Card with temp/humidity
  - News: List of articles
  - Time: Large clock display
  - Text: Formatted text block
  - Code: Monospace code block
  - Tasks: Checkbox list
```

---

## 🔌 API Integration

### Gemini AI
```typescript
// Voice (Live API)
Model: gemini-2.5-flash-native-audio-preview-12-2025
Features:
  - Real-time audio streaming
  - Voice transcription
  - Tool calling
  - Sub-second latency

// Text (REST API)
Model: gemini-2.0-flash-exp
Features:
  - Text generation
  - Translation
  - Summarization
  - Wikipedia search
```

### OpenAI
```typescript
// Code Analysis (REST API)
Model: gpt-4o-mini
Features:
  - Code analysis
  - Code improvement
  - Bug detection
  - Best practices
```

### External APIs
```typescript
Weather:    OpenWeatherMap API
            GET /data/2.5/weather?q={city}&appid={key}

News:       NewsAPI
            GET /v2/top-headlines?country=us&apiKey={key}

Memory:     Backend API
            POST /api/memory { key, value }
            GET /api/memory

PC Control: Local Agent
            POST /tool/run { tool_name, args }
```

---

## 📊 Data Flow

### Voice Interaction Flow
```
User speaks
    ↓
Microphone → Audio Context → Script Processor
    ↓
Gemini Live API (WebSocket)
    ↓
← Audio Response + Transcription
    ↓
Audio Playback + Message Display
```

### Text Chat Flow
```
User types → Input field
    ↓
handleSendText()
    ↓
Add to messages (user)
    ↓
Gemini API (REST)
    ↓
Add to messages (assistant)
```

### Tool Execution Flow
```
User clicks tool → handleQuickAction()
    ↓
Open drawer + Set loading
    ↓
Execute tool logic:
  - API call (Weather, News)
  - Gemini AI (Wikipedia, Translator)
  - Local processing (Time, Notepad)
    ↓
Set result + Display in drawer
```

---

## 🛠️ Tool Implementation Matrix

| Tool           | Type      | API Used        | Input Required | Auto-Execute |
|----------------|-----------|-----------------|----------------|--------------|
| Weather        | External  | OpenWeather     | No             | Yes          |
| News           | External  | NewsAPI         | No             | Yes          |
| Wikipedia      | AI        | Gemini          | Yes            | No           |
| Time           | Local     | Date()          | No             | Yes          |
| Music          | Placeholder| -              | Yes            | No           |
| Games          | Placeholder| -              | Yes            | No           |
| Background     | Placeholder| -              | Yes            | No           |
| Themes         | Placeholder| -              | Yes            | No           |
| Code Editor    | AI        | OpenAI          | Yes            | No           |
| Code Analyzer  | AI        | OpenAI          | Yes            | No           |
| Sketchpad      | Local     | -               | Yes            | No           |
| Summarizer     | AI        | Gemini          | Yes            | No           |
| Task Manager   | Local     | Split/Parse     | Yes            | No           |
| Notepad        | Local     | -               | Yes            | No           |
| Translator     | AI        | Gemini          | Yes            | No           |
| The Founder    | Static    | -               | No             | Yes          |
| Aura Memory    | Backend   | Memory API      | Yes            | No           |

---

## 📱 Responsive Breakpoints

```css
Mobile:     < 1024px
  - Sidebar hidden
  - Full-width chat
  - Floating menu button
  - Tool drawers slide from bottom

Desktop:    ≥ 1024px
  - Sidebar visible
  - Split layout
  - Tool drawers centered
  - Hover effects enabled
```

---

## 🎯 State Management

### React State
```typescript
// Voice Session
status: AssistantStatus (IDLE | LISTENING | SPEAKING | ERROR)
sessionRef: Gemini Live Session
audioContextRef: Web Audio API Context

// Chat
messages: Message[] (id, role, content, timestamp)
textInput: string

// Tools
activeDrawer: string | null
toolInput: string
toolResult: any
isLoading: boolean

// UI
isDark: boolean
isMuted: boolean
isSidebarOpen: boolean
isSettingsOpen: boolean
```

### Refs (Non-reactive)
```typescript
audioContextRef: AudioContext
sessionRef: Gemini Session
nextStartTimeRef: Audio timing
sourcesRef: Active audio sources
micStreamRef: MediaStream
currentTranscriptionRef: Live transcription
messagesEndRef: Auto-scroll target
```

---

## 🔐 Security & Performance

### Security
- API keys in .env (not committed)
- Backend auth (optional)
- Local agent token
- CORS configured
- Input sanitization

### Performance
- Lazy loading (tool drawers)
- Debounced inputs
- Optimized re-renders
- Audio buffer management
- Efficient state updates

### Accessibility
- Keyboard navigation
- Focus indicators
- ARIA labels
- Screen reader support
- Color contrast (WCAG AA)

---

## 📦 File Structure

```
Aura-AI-Assistant/
├── App.tsx                 # Main application
├── index.css              # Global styles
├── types.ts               # TypeScript types
├── .env                   # Environment variables
│
├── components/
│   ├── Settings.tsx       # Settings modal
│   └── Avatar.tsx         # (Legacy)
│
├── src/
│   ├── components/
│   │   ├── DesktopSettings.tsx
│   │   └── TerminalChat.tsx
│   └── services/
│       └── pcControl.ts   # PC control API
│
├── server/
│   ├── index.js           # Express server
│   ├── routes/            # API routes
│   ├── services/
│   │   └── local-agent.js # PC control agent
│   └── aura/              # Aura executor
│
└── utils/
    └── audio.ts           # Audio utilities
```

---

## 🚀 Deployment

### Development
```bash
# Frontend
npm run dev          # Port 5173

# Backend
cd server
npm start            # Port 3001

# Local Agent
cd server
node services/local-agent.js  # Port 8787
```

### Production
```bash
# Build frontend
npm run build

# Build desktop app
npm run tauri build

# Deploy backend
cd server
npm start
```

---

## 📈 Future Enhancements

1. **Tool Implementations**
   - Music player integration
   - Game library
   - Background customization
   - Theme builder

2. **Features**
   - Voice commands for tools
   - Multi-language support
   - Tool favorites
   - Keyboard shortcuts
   - Tool search

3. **Performance**
   - Service worker
   - Offline mode
   - Caching strategy
   - WebSocket for backend

4. **UI/UX**
   - Animations library
   - Custom themes
   - Tool categories
   - Recent tools

---

**Architecture Version:** 2.0  
**Last Updated:** 2025-01-13  
**Design System:** AI-Focused Glassmorphism  
**Framework:** React 18 + TypeScript + Tailwind CSS
