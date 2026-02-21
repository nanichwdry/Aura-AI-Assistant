import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Settings as SettingsIcon, Sun, Moon, Volume2, VolumeX, Send, Paperclip, Menu, X, Cloud, Newspaper, BookOpen, Clock, Music as MusicIcon, Gamepad2, Image, Palette, Code, FileSearch, PenTool, FileText, ListTodo, StickyNote, Languages, User, Brain, Navigation, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantStatus, Message } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audio';
import Settings from './components/Settings';
import DesktopSettings from './src/components/DesktopSettings';
import AuraV3Wrapper from './src/components/AuraV3Wrapper';
import { AuraAvatar } from './src/components/avatar/AuraAvatar';
import { CodeAnalyzerDrawer } from './src/tools/CodeAnalyzerDrawer';
import { AuraNewsDrawer } from './src/components/AuraNewsDrawer';
import { AuraSketchPad } from './src/components/AuraSketchPad';
import { AuraMusicPlayer } from './src/components/AuraMusicPlayer';
import { FounderProfile } from './src/components/FounderProfile';
import { AuraSketchpadDrawer } from './src/components/AuraSketchpadDrawer';
import { AuraNotepadDrawer } from './src/components/AuraNotepadDrawer';
import { AuraGamesDrawer } from './src/components/AuraGamesDrawer';
import { AuraRoutePlanner } from './src/components/AuraRoutePlanner';
import { AuraThemeManager } from './src/components/AuraThemeManager';
import { pcControlNL, pcControlExecute } from './src/services/pcControl';
import { API_BASE_URL } from './src/config/api';

const emailTool: FunctionDeclaration = {
  name: 'manage_emails',
  parameters: {
    type: Type.OBJECT,
    description: 'Direct integration with Outlook/Gmail. Use this to fetch, read, or summarize emails.',
    properties: {
      action: { type: Type.STRING, enum: ['search', 'read', 'summarize'], description: 'Action to perform' },
      query: { type: Type.STRING, description: 'Keywords, sender name, or subject line' }
    },
    required: ['action']
  }
};

const linkedInTool: FunctionDeclaration = {
  name: 'check_linkedin',
  parameters: {
    type: Type.OBJECT,
    description: 'Accesses LinkedIn API for notifications, private messages, or connection management.',
    properties: {
      scope: { type: Type.STRING, enum: ['notifications', 'messages', 'network'], description: 'Target area' }
    },
    required: ['scope']
  }
};

const systemTool: FunctionDeclaration = {
  name: 'os_command',
  parameters: {
    type: Type.OBJECT,
    description: 'Full PC control: open apps, create/delete files/folders, search files, run any command, manage processes, get system info.',
    properties: {
      task: { type: Type.STRING, description: 'Any system task or command' },
      tool_name: { type: Type.STRING, enum: ['open_app', 'open_url', 'open_url_id', 'open_project', 'reveal_file', 'create_file', 'delete_file', 'create_folder', 'delete_folder', 'search_files', 'get_system_info', 'list_processes', 'kill_process'], description: 'Specific tool to use' },
      args: { type: Type.OBJECT, description: 'Tool arguments' }
    },
    required: ['task']
  }
};

const memoryTool: FunctionDeclaration = {
  name: 'save_memory',
  parameters: {
    type: Type.OBJECT,
    description: 'Save important information about the user to long-term memory.',
    properties: {
      key: { type: Type.STRING, description: 'Memory key' },
      value: { type: Type.STRING, description: 'The information to remember' }
    },
    required: ['key', 'value']
  }
};

const toolsTool: FunctionDeclaration = {
  name: 'open_tool',
  parameters: {
    type: Type.OBJECT,
    description: 'Open any tool in the app: Weather, News, Wikipedia, Time, Music, Games, Background, Themes, Code Editor, Code Analyzer, Sketchpad, Summarizer, Task Manager, Notepad, Translator, The Founder, Aura Memory, Route Planner',
    properties: {
      tool_name: { type: Type.STRING, enum: ['Weather', 'News', 'Wikipedia', 'Time', 'Music', 'Games', 'Background', 'Themes', 'Code Editor', 'Code Analyzer', 'Sketchpad', 'Summarizer', 'Task Manager', 'Notepad', 'Translator', 'The Founder', 'Aura Memory', 'Route Planner'], description: 'Name of the tool to open' },
      input: { type: Type.STRING, description: 'Optional input for tools that need it (e.g., search query for Wikipedia)' }
    },
    required: ['tool_name']
  }
};

const executeToolTool: FunctionDeclaration = {
  name: 'execute_tool',
  parameters: {
    type: Type.OBJECT,
    description: 'Execute a tool and get results: search Wikipedia, translate text, summarize content, analyze code, get weather, fetch news, play music, plan routes with toll costs and timings, generate documents, etc.',
    properties: {
      tool: { type: Type.STRING, enum: ['weather', 'news', 'wikipedia', 'time', 'music', 'translator', 'summarizer', 'code_analyzer', 'code_editor', 'route_planner', 'generate_document'], description: 'Tool to execute' },
      input: { type: Type.OBJECT, description: 'Input parameters for the tool (e.g., {origin: "address", destination: "address", preference: "fastest"} or {content: "text", format: "pdf"})' }
    },
    required: ['tool']
  }
};

const SYSTEM_INSTRUCTION = `You are Aura, the user's elite AI personal assistant. Be snappy, witty, and human-like. Start speaking immediately. Use tools proactively.

For route/directions requests:
- Extract origin and destination from user query
- Use execute_tool with tool="route_planner" and input={origin: "address", destination: "address", preference: "fastest"}
- Provide toll costs, timings, and distance in your response
- If user asks about tolls specifically, mention both routes and their toll costs
- If user asks to avoid tolls, set preference to "avoid_tolls"

For document generation requests:
- When user asks to "summarize and make a document" or "create a PDF" or "generate a document"
- Use execute_tool with tool="generate_document" and input={content: "summary or content", format: "pdf" or "md"}
- Confirm document generation to user

Place technical data in Markdown blocks.`;

const QUICK_ACTIONS = [
  { name: 'Weather', icon: Cloud, color: 'from-blue-500 to-cyan-500' },
  { name: 'News', icon: Newspaper, color: 'from-orange-500 to-red-500' },
  { name: 'Wikipedia', icon: BookOpen, color: 'from-gray-500 to-slate-500' },
  { name: 'Time', icon: Clock, color: 'from-purple-500 to-pink-500' },
  { name: 'Route Planner', icon: Navigation, color: 'from-blue-500 to-purple-500' },
  { name: 'Music', icon: MusicIcon, color: 'from-green-500 to-emerald-500' },
  { name: 'Games', icon: Gamepad2, color: 'from-violet-500 to-purple-500' },
  { name: 'Background', icon: Image, color: 'from-indigo-500 to-blue-500' },
  { name: 'Themes', icon: Palette, color: 'from-pink-500 to-rose-500' },
  { name: 'Code Editor', icon: Code, color: 'from-yellow-500 to-orange-500' },
  { name: 'Code Analyzer', icon: FileSearch, color: 'from-teal-500 to-cyan-500' },
  { name: 'Sketchpad', icon: PenTool, color: 'from-fuchsia-500 to-pink-500' },
  { name: 'Summarizer', icon: FileText, color: 'from-blue-500 to-indigo-500' },
  { name: 'Task Manager', icon: ListTodo, color: 'from-green-500 to-teal-500' },
  { name: 'Notepad', icon: StickyNote, color: 'from-amber-500 to-yellow-500' },
  { name: 'Translator', icon: Languages, color: 'from-cyan-500 to-blue-500' },
  { name: 'The Founder', icon: User, color: 'from-slate-500 to-gray-500' },
  { name: 'Aura Memory', icon: Brain, color: 'from-purple-500 to-indigo-500' }
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [toolInput, setToolInput] = useState('');
  const [fromLang, setFromLang] = useState('auto');
  const [toLang, setToLang] = useState('en');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [showCodeAnalyzer, setShowCodeAnalyzer] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showSketchpad, setShowSketchpad] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [musicMinimized, setMusicMinimized] = useState(false);
  const [showFounder, setShowFounder] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [showNotepad, setShowNotepad] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [appBackground, setAppBackground] = useState<string | null>(null);
  
  const getThemeColors = () => {
    const themes: Record<string, { bg: string; card: string; text: string; muted: string; border: string }> = {
      dark: {
        bg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
        card: 'bg-slate-900/50 backdrop-blur-xl',
        text: 'text-gray-100',
        muted: 'text-gray-400',
        border: 'border-slate-800/50'
      },
      light: {
        bg: 'bg-gradient-to-br from-gray-50 via-white to-gray-50',
        card: 'bg-white/50 backdrop-blur-xl',
        text: 'text-gray-900',
        muted: 'text-gray-600',
        border: 'border-gray-200/50'
      },
      blue: {
        bg: 'bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950',
        card: 'bg-blue-900/50 backdrop-blur-xl',
        text: 'text-blue-50',
        muted: 'text-blue-300',
        border: 'border-blue-800/50'
      },
      purple: {
        bg: 'bg-gradient-to-br from-purple-950 via-purple-900 to-slate-950',
        card: 'bg-purple-900/50 backdrop-blur-xl',
        text: 'text-purple-50',
        muted: 'text-purple-300',
        border: 'border-purple-800/50'
      },
      green: {
        bg: 'bg-gradient-to-br from-green-950 via-green-900 to-slate-950',
        card: 'bg-green-900/50 backdrop-blur-xl',
        text: 'text-green-50',
        muted: 'text-green-300',
        border: 'border-green-800/50'
      },
      rose: {
        bg: 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-950',
        card: 'bg-rose-900/50 backdrop-blur-xl',
        text: 'text-rose-50',
        muted: 'text-rose-300',
        border: 'border-rose-800/50'
      }
    };
    return themes[currentTheme] || themes.dark;
  };
  
  const theme = getThemeColors();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentTranscriptionRef = useRef({ input: '', output: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setStatus(AssistantStatus.IDLE);
  }, []);

  const handleToolCall = async (fc: any, sessionPromise: Promise<any>) => {
    let response = { result: "Success" };
    
    if (fc.name === 'save_memory') {
      const { key, value } = fc.args;
      try {
        await fetch(`${API_BASE_URL}/api/memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });
        response.result = `Memory saved: ${key} = ${value}`;
      } catch (error) {
        console.error('Memory save failed:', error);
        response.result = 'Memory save failed - server offline';
      }
    }
    else if (fc.name === 'open_tool') {
      const { tool_name, input } = fc.args;
      // Open the tool in the UI
      setTimeout(() => {
        handleQuickAction(tool_name);
        if (input) {
          setToolInput(input);
        }
      }, 100);
      response.result = `Opening ${tool_name}${input ? ' with input: ' + input : ''}`;
    }
    else if (fc.name === 'execute_tool') {
      const { tool, input } = fc.args;
      try {
        if (tool === 'generate_document') {
          // Generate document from current conversation
          const content = input.content || messages[messages.length - 1]?.content || 'No content';
          const format = input.format || 'pdf';
          const timestamp = new Date().toLocaleString();
          
          if (format === 'pdf') {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <title>Aura AI Document</title>
                <style>
                  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
                  h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                  .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                  .content { background: #fff; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; white-space: pre-wrap; }
                  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; text-align: center; }
                </style>
              </head>
              <body>
                <h1>Aura AI Assistant - Document</h1>
                <div class="meta">Generated: ${timestamp}</div>
                <div class="content">${content}</div>
                <div class="footer">Generated by Aura AI Assistant</div>
              </body>
              </html>
            `;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(htmlContent);
              printWindow.document.close();
              setTimeout(() => printWindow.print(), 250);
            }
          } else {
            const mdContent = `# Aura AI Document\n\nGenerated: ${timestamp}\n\n${content}\n\n---\nGenerated by Aura AI Assistant`;
            const blob = new Blob([mdContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aura-document-${Date.now()}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }
          response.result = `Document generated successfully in ${format.toUpperCase()} format. ${format === 'pdf' ? 'Print dialog opened.' : 'File downloaded.'}`;
        } else {
          const res = await fetch(`${API_BASE_URL}/api/tools/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, input: input || {} })
          });
          const data = await res.json();
          if (data.success) {
            // Format route planner response for voice
            if (tool === 'route_planner' && data.data) {
              const { best, noTolls, recommendation } = data.data;
              const bestTime = Math.round(best.durationSec / 60);
              const noTollsTime = Math.round(noTolls.durationSec / 60);
              const bestDist = (best.distanceMeters * 0.000621371).toFixed(1);
              const noTollsDist = (noTolls.distanceMeters * 0.000621371).toFixed(1);
              
              let summary = `Route from ${data.data.origin} to ${data.data.destination}:\n\n`;
              summary += `Best Route: ${bestTime} minutes, ${bestDist} miles`;
              if (best.toll) {
                summary += `, tolls: $${best.toll.units.toFixed(2)}`;
              } else if (best.hasTolls) {
                summary += `, tolls may apply`;
              }
              summary += `\n\nNo Tolls Route: ${noTollsTime} minutes, ${noTollsDist} miles, no tolls`;
              summary += `\n\nRecommendation: ${recommendation.choice === 'best' ? 'Best Route' : 'No Tolls Route'} - ${recommendation.reason}`;
              
              response.result = summary;
            } else {
              response.result = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
            }
          } else {
            response.result = data.error || 'Tool execution failed';
          }
        }
      } catch (error) {
        response.result = 'Tool execution failed - server offline';
      }
    }
    else if (fc.name === 'manage_emails') {
      const res = await fetch(`${API_BASE_URL}/api/tools/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fc.args)
      }).catch(() => ({ json: () => ({ error: 'Server offline' }) }));
      const data = await res.json();
      response.result = data.error || `Found ${data.length} emails`;
    }
    else if (fc.name === 'check_linkedin') {
      const res = await fetch(`${API_BASE_URL}/api/tools/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fc.args)
      }).catch(() => ({ json: () => ({ error: 'Server offline' }) }));
      const data = await res.json();
      response.result = data.error || JSON.stringify(data);
    }
    else if (fc.name === 'os_command') {
      if (fc.args.tool_name && fc.args.args) {
        const result = await pcControlExecute(fc.args.tool_name, fc.args.args);
        response.result = result.ok ? result.result : result.error;
      } else {
        const result = await pcControlNL(fc.args.task);
        response.result = result.ok ? result.result : result.error;
      }
    }

    const session = await sessionPromise;
    session.sendToolResponse({
      functionResponses: { id: fc.id, name: fc.name, response }
    });
  };

  const startSession = async () => {
    try {
      setStatus(AssistantStatus.LISTENING);
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
      
      const memory = await fetch(`${API_BASE_URL}/api/memory`)
        .then(r => r.ok ? r.json() : {})
        .catch(e => {
          console.error('Memory fetch failed:', e);
          return {};
        });
      const memoryContext = Object.keys(memory).length > 0 
        ? `\n\nUSER MEMORY:\n${Object.entries(memory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : '';
      
      if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContextRef.current.resume();
      }
      
      const outCtx = audioContextRef.current;
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: [emailTool, linkedInTool, systemTool, memoryTool, toolsTool, executeToolTool] }],
          systemInstruction: SYSTEM_INSTRUCTION + memoryContext,
        },
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(1024, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) handleToolCall(fc, sessionPromise);
            }

            if (message.serverContent?.outputTranscription) {
              currentTranscriptionRef.current.output += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentTranscriptionRef.current.input += message.serverContent.inputTranscription.text;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && !isMuted) {
              setStatus(AssistantStatus.SPEAKING);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setStatus(AssistantStatus.LISTENING);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.turnComplete) {
              const { input, output } = currentTranscriptionRef.current;
              if (input || output) {
                setMessages(prev => [
                  ...prev,
                  { id: Date.now().toString(), role: 'user' as const, content: input || '(Voice)', timestamp: new Date() },
                  { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: output || 'Processing...', timestamp: new Date() }
                ]);
              }
              currentTranscriptionRef.current = { input: '', output: '' };
              setStatus(AssistantStatus.LISTENING);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => setStatus(AssistantStatus.ERROR),
          onclose: () => setStatus(AssistantStatus.IDLE)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      setStatus(AssistantStatus.ERROR);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'Code Analyzer') {
      setShowCodeAnalyzer(true);
      return;
    }
    
    if (action === 'News') {
      setShowNews(true);
      return;
    }
    
    if (action === 'Sketchpad') {
      setShowSketchpad(true);
      return;
    }
    
    if (action === 'Music') {
      setShowMusic(true);
      return;
    }
    
    if (action === 'Games') {
      setShowGames(true);
      return;
    }
    
    if (action === 'The Founder') {
      setShowFounder(true);
      return;
    }
    
    if (action === 'Notepad') {
      setShowNotepad(true);
      return;
    }
    
    if (action === 'Route Planner') {
      setShowRoutePlanner(true);
      return;
    }
    
    if (action === 'Themes') {
      setShowThemes(true);
      return;
    }
    
    setActiveDrawer(action);
    setToolResult(null);
    setToolInput('');
    
    // Tools that require input - just open drawer
    const inputRequiredTools = ['Wikipedia', 'Code Editor', 'Code Analyzer', 'Translator', 'Summarizer', 'Notepad', 'Sketchpad', 'Task Manager', 'Aura Memory'];
    if (inputRequiredTools.includes(action)) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get location for weather
      let locationCity = null;
      if (action === 'Weather' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          const { latitude, longitude } = position.coords;
          const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`);
          const geoData = await geoResponse.json();
          locationCity = geoData[0]?.name;
        } catch (e) {
          console.log('Geolocation failed, using default');
        }
      }
      
      // Map action names to tool names
      const toolMap: { [key: string]: string } = {
        'Weather': 'weather',
        'News': 'news', 
        'Wikipedia': 'wikipedia',
        'Time': 'time',
        'Music': 'music',
        'Games': 'games',
        'Background': 'background',
        'Themes': 'themes',
        'Code Editor': 'code_editor',
        'Code Analyzer': 'code_analyzer',
        'Sketchpad': 'sketchpad',
        'Summarizer': 'summarizer',
        'Task Manager': 'task_manager',
        'Notepad': 'notepad',
        'Translator': 'translator',
        'The Founder': 'founder',
        'Aura Memory': 'memory'
      };
      
      const toolName = toolMap[action];
      if (!toolName) {
        throw new Error(`Unknown tool: ${action}`);
      }
      
      const response = await fetch(`${API_BASE_URL}/api/tools/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tool: toolName,
          input: locationCity ? { city: locationCity } : {}
        })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }
      
      // Map the response data to the expected format
      switch(action) {
        case 'Weather':
          setToolResult({ type: 'weather', data: result.data });
          break;
        case 'News':
          setToolResult({ type: 'news', data: result.data });
          break;
        case 'Background':
          setToolResult({ type: 'background', data: result.data });
          break;
        case 'Time':
          setToolResult({ type: 'time', data: new Date(result.data) });
          break;
        case 'The Founder':
          setToolResult({ type: 'founder', data: result.data });
          break;
        default:
          setToolResult({ type: 'placeholder', data: result.data.message || JSON.stringify(result.data) });
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      setToolResult({ type: 'error', data: error.message || 'Failed to load. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolSubmit = async () => {
    if (!toolInput.trim() || !activeDrawer) return;
    setIsLoading(true);
    
    try {
      switch(activeDrawer) {
        case 'Code Analyzer':
        case 'Code Editor':
          const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
          if (!openaiKey) throw new Error('OpenAI API key not configured');
          
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: activeDrawer === 'Code Analyzer' 
                  ? `Analyze this code and provide insights, potential bugs, and improvements:\n\n${toolInput}`
                  : `Format and improve this code:\n\n${toolInput}`
              }]
            })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');
          setToolResult({ type: 'code', data: data.choices[0].message.content });
          break;
          
        case 'Wikipedia':
          const wikiResponse = await fetch(`${API_BASE_URL}/api/tools/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tool: 'wikipedia',
              input: { query: toolInput }
            })
          });
          
          const wikiResult = await wikiResponse.json();
          if (!wikiResult.success) throw new Error(wikiResult.error || 'Tool execution failed');
          setToolResult({ type: 'text', data: wikiResult.data });
          break;
          
        case 'Translator':
          const transResponse = await fetch(`${API_BASE_URL}/api/tools/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tool: 'translator',
              input: { text: toolInput, from: fromLang, to: toLang }
            })
          });
          
          const transResult = await transResponse.json();
          if (!transResult.success) throw new Error(transResult.error || 'Tool execution failed');
          setToolResult({ type: 'translation', data: transResult.data });
          break;
          
        case 'Summarizer':
          const summResponse = await fetch(`${API_BASE_URL}/api/tools/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tool: 'summarizer',
              input: { text: toolInput }
            })
          });
          
          const summResult = await summResponse.json();
          if (!summResult.success) throw new Error(summResult.error || 'Tool execution failed');
          setToolResult({ type: 'text', data: summResult.data });
          break;
          
        case 'Notepad':
        case 'Sketchpad':
          setToolResult({ type: 'text', data: toolInput });
          break;
          
        case 'Task Manager':
          const tasks = toolInput.split('\n').filter(t => t.trim());
          setToolResult({ type: 'tasks', data: tasks });
          break;
          
        case 'Aura Memory':
          await fetch(`${API_BASE_URL}/api/memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: Date.now().toString(), value: toolInput })
          }).catch(() => {});
          setToolResult({ type: 'text', data: 'Memory saved successfully!' });
          break;
          
        default:
          setToolResult({ type: 'text', data: toolInput });
      }
    } catch (error) {
      console.error('Tool submit error:', error);
      setToolResult({ type: 'error', data: error.message || 'Failed to process. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSession = () => (status === AssistantStatus.IDLE ? startSession() : stopSession());

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    const userMessage = textInput;
    setTextInput('');
    
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date() 
    }]);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
      if (!apiKey) {
        throw new Error('Gemini API key not configured');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(userMessage);
      const response = result.response.text();
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response, 
        timestamp: new Date() 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`, 
        timestamp: new Date() 
      }]);
    }
  };

  const downloadAsDocument = (message: Message, format: 'md' | 'pdf' = 'md') => {
    const userQuestion = messages.find(m => m.id === (parseInt(message.id) - 1).toString())?.content || 'N/A';
    const content = `# Aura AI Assistant - Response\n\nDate: ${message.timestamp.toLocaleString()}\n\n## Question\n${userQuestion}\n\n## Answer\n${message.content}\n\n---\nGenerated by Aura AI Assistant`;
    
    if (format === 'pdf') {
      // Create HTML for PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Aura AI Response</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
            h2 { color: #4f46e5; margin-top: 30px; }
            .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
            .question { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .answer { background: #fff; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; white-space: pre-wrap; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Aura AI Assistant - Response</h1>
          <div class="meta">Date: ${message.timestamp.toLocaleString()}</div>
          <h2>Question</h2>
          <div class="question">${userQuestion}</div>
          <h2>Answer</h2>
          <div class="answer">${message.content}</div>
          <div class="footer">Generated by Aura AI Assistant</div>
        </body>
        </html>
      `;
      
      // Open print dialog for PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    } else {
      // Download as Markdown
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-response-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const bgColor = appBackground ? '' : theme.bg;
  const cardBg = theme.card;
  const textColor = theme.text;
  const mutedText = theme.muted;
  const borderColor = theme.border;
  const accentColor = 'indigo';

  return (
    <AuraV3Wrapper>
      <div className="fixed inset-0 h-screen w-screen overflow-hidden">
        {/* Background Layer - Always visible */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {appBackground ? (
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${appBackground})` }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            </div>
          ) : (
            <>
              <div className={`absolute inset-0 ${bgColor}`} />
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 bg-gradient-to-b from-cyan-400/40 via-cyan-400/20 to-transparent"
                  style={{
                    left: `${i * 3.33}%`,
                    height: `${40 + Math.random() * 80}px`,
                    animation: `drop ${3 + Math.random() * 4}s linear infinite`,
                    animationDelay: `${Math.random() * 5}s`
                  }}
                />
              ))}
            </>
          )}
        </div>
        <style>{`
          @keyframes drop {
            0% { transform: translateY(-100%); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 0.8; }
            100% { transform: translateY(100vh); opacity: 0; }
          }
        `}</style>

        {/* Main Shell - Fixed grid layout */}
        <div className="relative z-10 h-full grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          {/* Left: Main Content Area */}
          <main className="h-full overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className={`shrink-0 h-16 ${cardBg} border-b ${borderColor} flex items-center justify-between px-6 shadow-lg`}>
              <div className="flex items-center gap-3">
                <img src="/Aura AI logo.png" alt="Aura" className="w-8 h-8 rounded-xl" />
                <span className="font-semibold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Aura</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleToggleSession} className={`p-2.5 rounded-xl transition-all ${status !== AssistantStatus.IDLE ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50' : 'hover:bg-gray-700/10'}`}>
                  {status !== AssistantStatus.IDLE ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsDark(!isDark)} className="p-2.5 rounded-xl hover:bg-gray-700/10 transition-colors">
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 rounded-xl hover:bg-gray-700/10 transition-colors">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl hover:bg-gray-700/10 transition-colors">
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hero Area - Transitions between full and compact */}
            <div className={`shrink-0 transition-all duration-500 ${messages.length === 0 ? 'h-64' : 'h-20'} flex items-center justify-center`}>
              <div className="flex items-center gap-6">
                <motion.div 
                  animate={{ 
                    scale: messages.length === 0 ? 1 : 0.5,
                    opacity: messages.length === 0 ? 1 : 0.7
                  }}
                  transition={{ duration: 0.5 }}
                  className="relative"
                >
                  <motion.div 
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(124, 58, 237, 0.3)',
                        '0 0 60px rgba(124, 58, 237, 0.6)',
                        '0 0 20px rgba(124, 58, 237, 0.3)'
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl blur-2xl opacity-50"
                  />
                  <div className="relative">
                    <AuraAvatar isSpeaking={status === AssistantStatus.SPEAKING} />
                  </div>
                </motion.div>
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      Hi, I'm Aura
                    </h2>
                    <p className={mutedText}>Your AI-powered personal assistant</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Chat Area - Fixed height with internal scroll */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 aura-scrollbar">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'aura-accent shadow-lg' : `aura-card border ${borderColor}`}`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        {msg.role === 'assistant' && (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => downloadAsDocument(msg, 'md')}
                              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                              title="Download as Markdown"
                            >
                              <Download className="w-3 h-3" />
                              MD
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              onClick={() => downloadAsDocument(msg, 'pdf')}
                              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                              title="Download as PDF"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar - Sticky at bottom */}
              <div className={`shrink-0 p-4 border-t ${borderColor} ${cardBg}`}>
                <div className={`flex items-center gap-2 aura-card rounded-2xl px-4 py-2 border ${borderColor}`}>
                  <button className={`p-2 hover:bg-gray-700/10 rounded-lg transition-colors ${mutedText}`}>
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="Type a message..."
                    className={`flex-1 bg-transparent outline-none ${textColor} aura-input`}
                  />
                  <button onClick={handleSendText} className="p-2 aura-accent rounded-xl hover:scale-105 transition-transform shadow-lg">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Right: Tools Panel - Always visible */}
          <aside className={`hidden lg:block h-full border-l ${borderColor} ${cardBg} overflow-y-auto`}>
            <div className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <img src="/Aura AI logo.png" alt="AURA" className="w-5 h-5" />
                AI Tools
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.name}
                      onClick={() => handleQuickAction(action.name)}
                      className={`group relative p-4 rounded-2xl border ${borderColor} hover:border-indigo-500/50 transition-all text-sm overflow-hidden hover-lift`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative flex flex-col items-center gap-2">
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs font-medium">{action.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl shadow-indigo-500/50 z-40 hover:scale-110 transition-transform"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

        {/* Mobile Sidebar Drawer */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div onClick={() => setIsSidebarOpen(false)} className="flex-1 bg-black/50 backdrop-blur-sm" />
            <div className={`w-80 ${cardBg} p-6 overflow-y-auto border-l ${borderColor}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <img src="/Aura AI logo.png" alt="AURA" className="w-5 h-5" />
                  AI Tools
                </h3>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-700/10 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.name}
                      onClick={() => { handleQuickAction(action.name); setIsSidebarOpen(false); }}
                      className={`group relative p-4 rounded-2xl border ${borderColor} hover:border-indigo-500/50 transition-all text-sm overflow-hidden`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      <div className="relative flex flex-col items-center gap-2">
                        <Icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs font-medium">{action.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      {/* Tool Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center animate-in fade-in duration-200">
          <div onClick={() => setActiveDrawer(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className={`relative ${cardBg} border ${borderColor} rounded-t-3xl lg:rounded-3xl w-full lg:w-[700px] max-h-[85vh] overflow-hidden shadow-2xl`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
              {activeDrawer === 'Aura Memory' ? (
                <>
                  <div className="flex items-center gap-3">
                    <img src="/Aura AI logo.png" alt="AURA" className="w-10 h-10 rounded-full" />
                    <h3 className="font-semibold text-lg">Memory</h3>
                  </div>
                  <button onClick={() => setActiveDrawer(null)} className="p-2 hover:bg-gray-700/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {QUICK_ACTIONS.find(a => a.name === activeDrawer) && (
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${QUICK_ACTIONS.find(a => a.name === activeDrawer)?.color} bg-opacity-10`}>
                        {React.createElement(QUICK_ACTIONS.find(a => a.name === activeDrawer)!.icon, { className: 'w-5 h-5 text-indigo-400' })}
                      </div>
                    )}
                    <h3 className="font-semibold text-lg">{activeDrawer}</h3>
                  </div>
                  <button onClick={() => setActiveDrawer(null)} className="p-2 hover:bg-gray-700/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : toolResult ? (
                <div className="space-y-4">
                  {toolResult.type === 'weather' && toolResult.data && (
                    <div className="relative p-6 rounded-2xl border border-transparent overflow-hidden">
                      <div className="relative z-10 backdrop-blur-sm bg-slate-900/50 p-6 rounded-xl space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-2xl font-bold">{toolResult.data.name || 'Unknown Location'}</h4>
                            {toolResult.data.weather?.[0] && (
                              <p className={mutedText}>{toolResult.data.weather[0].description}</p>
                            )}
                          </div>
                          {toolResult.data.main && (
                            <div className="text-4xl font-bold">{Math.round(toolResult.data.main.temp)}°C</div>
                          )}
                        </div>
                        
                        {toolResult.data.main && (
                          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                            <div><span className={mutedText}>Feels like:</span> {Math.round(toolResult.data.main.feels_like)}°C</div>
                            <div><span className={mutedText}>Humidity:</span> {toolResult.data.main.humidity}%</div>
                            <div><span className={mutedText}>Wind:</span> {toolResult.data.wind?.speed || 0} m/s</div>
                          </div>
                        )}
                        
                        {/* Air Quality */}
                        {toolResult.data.airQuality?.indexes && (
                          <div className="pt-4 border-t border-slate-700/50">
                            <h5 className="font-semibold mb-3 flex items-center gap-2">
                              <span>Air Quality</span>
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                toolResult.data.airQuality.indexes[0].aqi <= 50 ? 'bg-green-500/20 text-green-400' :
                                toolResult.data.airQuality.indexes[0].aqi <= 100 ? 'bg-yellow-500/20 text-yellow-400' :
                                toolResult.data.airQuality.indexes[0].aqi <= 150 ? 'bg-orange-500/20 text-orange-400' :
                                toolResult.data.airQuality.indexes[0].aqi <= 200 ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {toolResult.data.airQuality.indexes[0].category}
                              </span>
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="p-3 rounded-lg bg-slate-800/50">
                                <span className={mutedText}>AQI:</span>
                                <span className="ml-2 font-semibold">{toolResult.data.airQuality.indexes[0].aqi}</span>
                              </div>
                              {toolResult.data.airQuality.pollutants?.slice(0, 3).map((pollutant: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-slate-800/50">
                                  <span className={mutedText}>{pollutant.code}:</span>
                                  <span className="ml-2 font-semibold">{pollutant.concentration?.value?.toFixed(1)} {pollutant.concentration?.units}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Pollen */}
                        {toolResult.data.pollen?.dailyInfo?.[0] && (
                          <div className="pt-4 border-t border-slate-700/50">
                            <h5 className="font-semibold mb-3">Pollen Forecast</h5>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              {toolResult.data.pollen.dailyInfo[0].pollenTypeInfo?.map((pollen: any, i: number) => (
                                <div key={i} className="p-3 rounded-lg bg-slate-800/50">
                                  <div className={mutedText}>{pollen.displayName}:</div>
                                  <div className={`font-semibold ${
                                    pollen.indexInfo.value <= 1 ? 'text-green-400' :
                                    pollen.indexInfo.value <= 2 ? 'text-yellow-400' :
                                    pollen.indexInfo.value <= 3 ? 'text-orange-400' : 'text-red-400'
                                  }`}>
                                    {pollen.indexInfo.category}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {toolResult.type === 'news' && Array.isArray(toolResult.data) && (
                    <div className="space-y-3">
                      {toolResult.data.length > 0 ? toolResult.data.map((article: any, i: number) => (
                        <div key={i} className={`p-4 rounded-xl border ${borderColor} ${cardBg} hover:border-indigo-500/50 transition-colors cursor-pointer`} onClick={() => article.url && window.open(article.url, '_blank')}>
                          {article.urlToImage && (
                            <img 
                              src={article.urlToImage} 
                              alt={article.title}
                              className="w-full h-32 object-cover rounded-lg mb-3"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <h4 className="font-semibold mb-1">{article.title || 'No title'}</h4>
                          <p className={`text-sm ${mutedText} line-clamp-2 mb-2`}>{article.description || 'No description available'}</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-indigo-400">{article.source?.name || 'Unknown source'}</span>
                            {article.publishedAt && (
                              <span className={mutedText}>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className={`p-6 rounded-xl border ${borderColor} ${cardBg} text-center ${mutedText}`}>
                          No news articles available
                        </div>
                      )}
                    </div>
                  )}
                  
                  {toolResult.type === 'time' && (
                    <div className={`p-8 rounded-2xl border ${borderColor} ${cardBg} text-center`}>
                      <div className="text-5xl font-bold mb-2">{toolResult.data.toLocaleTimeString()}</div>
                      <div className={`text-lg ${mutedText}`}>{toolResult.data.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                  )}
                  
                  {toolResult.type === 'founder' && (
                    <div className={`p-8 rounded-2xl border ${borderColor} ${cardBg} text-center`}>
                      <User className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
                      <h4 className="text-2xl font-bold mb-2">{toolResult.data.name}</h4>
                      <p className={mutedText}>{toolResult.data.role}</p>
                    </div>
                  )}
                  
                  {toolResult.type === 'background' && (
                    <div className={`p-6 rounded-2xl border ${borderColor} ${cardBg}`}>
                      <img 
                        src={toolResult.data.urls?.regular || toolResult.data.urls?.small} 
                        alt={toolResult.data.alt_description || 'Background image'}
                        className="w-full h-96 object-cover rounded-xl mb-4"
                      />
                      <div className="text-center space-y-3">
                        <p className="font-semibold">{toolResult.data.alt_description || 'Beautiful background'}</p>
                        <p className={`text-sm ${mutedText}`}>Photo by {toolResult.data.user?.name || 'Unknown'}</p>
                        <div className="flex gap-2 justify-center">
                          <button 
                            onClick={() => setAppBackground(toolResult.data.urls?.regular)}
                            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700 transition-all"
                          >
                            Set as Background
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = toolResult.data.urls?.regular;
                              link.download = 'aura-background.jpg';
                              link.click();
                            }}
                            className="px-4 py-2 border ${borderColor} rounded-lg text-sm hover:bg-slate-800/50 transition-all"
                          >
                            Download
                          </button>
                          <button 
                            onClick={() => window.open(toolResult.data.links?.html, '_blank')}
                            className="px-4 py-2 border ${borderColor} rounded-lg text-sm hover:bg-slate-800/50 transition-all"
                          >
                            View Source
                          </button>
                        </div>
                        {appBackground && (
                          <button 
                            onClick={() => setAppBackground(null)}
                            className="mt-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove Background
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {toolResult.type === 'tasks' && (
                    <div className="space-y-2">
                      {toolResult.data.map((task: string, i: number) => (
                        <div key={i} className={`p-3 rounded-xl border ${borderColor} ${cardBg} flex items-center gap-3`}>
                          <div className="w-5 h-5 rounded border-2 border-indigo-500"></div>
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(toolResult.type === 'text' || toolResult.type === 'code') && (
                    <div className={`p-6 rounded-2xl border ${borderColor} ${cardBg} ${toolResult.type === 'code' ? 'font-mono text-sm' : ''}`}>
                      <pre className="whitespace-pre-wrap">{toolResult.data}</pre>
                    </div>
                  )}
                  
                  {toolResult.type === 'translation' && (
                    <div className={`p-6 rounded-2xl border ${borderColor} ${cardBg} space-y-4`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm ${mutedText}`}>Original ({toolResult.data.from === 'auto' ? 'Auto-detected' : toolResult.data.from.toUpperCase()})</span>
                        </div>
                        <div className={`p-4 rounded-xl border ${borderColor} bg-slate-800/50`}>
                          <p className="whitespace-pre-wrap">{toolResult.data.original}</p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className="p-2 rounded-full bg-indigo-500/20">
                          <Languages className="w-5 h-5 text-indigo-400" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm ${mutedText}`}>Translated ({toolResult.data.to.toUpperCase()})</span>
                        </div>
                        <div className={`p-4 rounded-xl border ${borderColor} bg-indigo-500/10`}>
                          <p className="whitespace-pre-wrap font-medium">{toolResult.data.translated}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {toolResult.type === 'placeholder' && (
                    <div className={`p-8 rounded-2xl border ${borderColor} ${cardBg} text-center ${mutedText}`}>
                      {toolResult.data}
                    </div>
                  )}
                  
                  {toolResult.type === 'error' && (
                    <div className="p-6 rounded-2xl border border-red-500/50 bg-red-500/10 text-red-400 text-center">
                      {toolResult.data}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border ${borderColor} ${cardBg} text-center ${mutedText}`}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
                </div>
              )}
            </div>
            
            {/* Input Area */}
            {activeDrawer === 'Aura Memory' ? (
              <div className="p-6">
                <div className="text-center space-y-6">
                  <div>
                    <h5 className="text-xl font-semibold mb-2">Coming Soon: The Evolution of AURA</h5>
                    <p className={`${mutedText} max-w-2xl mx-auto`}>AURA Memory is currently in development. We are building a more intuitive experience where AURA doesn't just process commands, but remembers your journey to assist you with true intelligence.</p>
                  </div>
                  
                  <div className="space-y-4 text-left max-w-2xl mx-auto pt-4">
                    <h5 className="text-xl font-semibold text-center mb-6">What's on the Horizon</h5>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-lg mb-1">Tailored Intelligence</p>
                        <p className="text-sm text-gray-400">AURA will learn your unique preferences over time, delivering hyper-personalized responses that align with your specific needs and style.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-lg mb-1">Persistent Context</p>
                        <p className="text-sm text-gray-400">Seamlessly reference past interactions. AURA will maintain a long-term conversation history, allowing you to pick up exactly where you left off.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="font-semibold text-lg mb-1">Proactive Insights</p>
                        <p className="text-sm text-gray-400">Experience a smarter assistant that anticipates your needs with proactive suggestions based on your evolving usage patterns.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeDrawer === 'Translator' ? (
              <div className={`p-4 border-t ${borderColor} space-y-3`}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${mutedText} mb-1 block`}>From</label>
                    <select value={fromLang} onChange={(e) => setFromLang(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${cardBg} outline-none focus:border-indigo-500 text-sm`}>
                      <option value="auto">Auto-detect</option>
                      <option value="te">Telugu</option>
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="ta">Tamil</option>
                      <option value="bn">Bengali</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-xs ${mutedText} mb-1 block`}>To</label>
                    <select value={toLang} onChange={(e) => setToLang(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${borderColor} ${cardBg} outline-none focus:border-indigo-500 text-sm`}>
                      <option value="en">English</option>
                      <option value="te">Telugu</option>
                      <option value="hi">Hindi</option>
                      <option value="ta">Tamil</option>
                      <option value="bn">Bengali</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="ko">Korean</option>
                      <option value="zh">Chinese</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleToolSubmit()}
                    placeholder="Enter text to translate..."
                    className={`flex-1 px-4 py-3 rounded-xl border ${borderColor} ${cardBg} outline-none focus:border-indigo-500 transition-colors`}
                  />
                  <button
                    onClick={handleToolSubmit}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-medium"
                  >
                    Translate
                  </button>
                </div>
              </div>
            ) : !['Weather', 'News', 'Time', 'The Founder'].includes(activeDrawer) && (
              <div className={`p-4 border-t ${borderColor}`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleToolSubmit()}
                    placeholder={`Enter ${activeDrawer.toLowerCase()} input...`}
                    className={`flex-1 px-4 py-3 rounded-xl border ${borderColor} ${cardBg} outline-none focus:border-indigo-500 transition-colors`}
                  />
                  <button
                    onClick={handleToolSubmit}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-medium"
                  >
                    Run
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSettingsOpen && (
        window.__TAURI__ ? 
          <DesktopSettings onClose={() => setIsSettingsOpen(false)} /> :
          <Settings onClose={() => setIsSettingsOpen(false)} />
      )}
      
      {showCodeAnalyzer && (
        <CodeAnalyzerDrawer onClose={() => setShowCodeAnalyzer(false)} />
      )}
      
      {showNews && (
        <AuraNewsDrawer onClose={() => setShowNews(false)} />
      )}
      
      {showSketchpad && (
        <AuraSketchpadDrawer onClose={() => setShowSketchpad(false)} />
      )}
      
      {showMusic && !musicMinimized && (
        <AuraMusicPlayer 
          onClose={() => setShowMusic(false)} 
          onMinimize={() => setMusicMinimized(true)}
        />
      )}
      
      {/* Minimized Music Player */}
      {showMusic && musicMinimized && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setMusicMinimized(false)}
            className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full shadow-2xl shadow-green-500/50 hover:scale-110 transition-transform"
          >
            <Volume2 className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {showSketchpad && (
        <AuraSketchpadDrawer onClose={() => setShowSketchpad(false)} />
      )}
      
      {showNotepad && (
        <AuraNotepadDrawer onClose={() => setShowNotepad(false)} />
      )}
      
      {showGames && (
        <AuraGamesDrawer onClose={() => setShowGames(false)} />
      )}
      
      {showFounder && (
        <FounderProfile onClose={() => setShowFounder(false)} />
      )}
      
      {showRoutePlanner && (
        <AuraRoutePlanner onClose={() => setShowRoutePlanner(false)} />
      )}
      
      {showThemes && (
        <AuraThemeManager 
          onClose={() => setShowThemes(false)}
          currentTheme={currentTheme}
          onThemeChange={(theme) => {
            setCurrentTheme(theme);
            setIsDark(theme === 'dark');
          }}
        />
      )}
    </AuraV3Wrapper>
  );
};

export default App;
