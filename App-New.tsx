import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Settings as SettingsIcon, Sun, Moon, Volume2, VolumeX, Send, Paperclip, Menu, X } from 'lucide-react';
import { AssistantStatus, Message } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audio';
import Settings from './components/Settings';
import DesktopSettings from './src/components/DesktopSettings';
import { pcControlNL, pcControlExecute } from './src/services/pcControl';

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

const SYSTEM_INSTRUCTION = `You are Aura, the user's elite AI personal assistant. Be snappy, witty, and human-like. Start speaking immediately. Use tools proactively. Place technical data in Markdown blocks.`;

const QUICK_ACTIONS = [
  'Weather', 'News', 'Wikipedia', 'Time', 'Music', 'Games', 
  'Background', 'Themes', 'Code Editor', 'Code Analyzer', 
  'Sketchpad', 'Summarizer', 'Task Manager', 'Notepad', 
  'Translator', 'The Founder', 'Aura Memory'
];

const App: React.FC = () => {
  const [status, setStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  
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
      await fetch('http://localhost:3001/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(() => {});
      response.result = `Memory saved: ${key} = ${value}`;
    }
    else if (fc.name === 'manage_emails') {
      const res = await fetch('http://localhost:3001/api/tools/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fc.args)
      }).catch(() => ({ json: () => ({ error: 'Server offline' }) }));
      const data = await res.json();
      response.result = data.error || `Found ${data.length} emails`;
    }
    else if (fc.name === 'check_linkedin') {
      const res = await fetch('http://localhost:3001/api/tools/linkedin', {
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
      
      const memory = await fetch('http://localhost:3001/api/memory').then(r => r.json()).catch(() => ({}));
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
          tools: [{ functionDeclarations: [emailTool, linkedInTool, systemTool, memoryTool] }],
          systemInstruction: SYSTEM_INSTRUCTION + memoryContext,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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

  const handleToggleSession = () => (status === AssistantStatus.IDLE ? startSession() : stopSession());

  const handleSendText = () => {
    if (!textInput.trim()) return;
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: textInput, 
      timestamp: new Date() 
    }]);
    setTextInput('');
  };

  const bgColor = isDark ? 'bg-[#1a1a1f]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#25252b]' : 'bg-white';
  const textColor = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const accentColor = 'indigo';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${bgColor} ${textColor} font-sans`}>
      {/* Top Bar */}
      <div className={`fixed top-0 left-0 right-0 h-16 ${cardBg} border-b ${borderColor} flex items-center justify-between px-6 z-50`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 bg-${accentColor}-600 rounded-xl flex items-center justify-center text-white font-bold`}>A</div>
          <span className="font-semibold text-lg">Aura</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleToggleSession} className={`p-2.5 rounded-xl transition-colors ${status !== AssistantStatus.IDLE ? `bg-${accentColor}-600 text-white` : `${cardBg} hover:bg-gray-700/10`}`}>
            {status !== AssistantStatus.IDLE ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsDark(!isDark)} className={`p-2.5 rounded-xl ${cardBg} hover:bg-gray-700/10 transition-colors`}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2.5 rounded-xl ${cardBg} hover:bg-gray-700/10 transition-colors`}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className={`p-2.5 rounded-xl ${cardBg} hover:bg-gray-700/10 transition-colors`}>
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-16">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className={`w-16 h-16 bg-${accentColor}-600 rounded-2xl mb-4 flex items-center justify-center`}>
                  <span className="text-2xl text-white font-bold">A</span>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Hi, I'm Aura</h2>
                <p className={mutedText}>Your personal AI assistant. How can I help?</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? `bg-${accentColor}-600 text-white` : `${cardBg} border ${borderColor}`}`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className={`p-4 border-t ${borderColor}`}>
            <div className={`flex items-center gap-2 ${cardBg} rounded-2xl px-4 py-2 border ${borderColor}`}>
              <button className={`p-2 hover:bg-gray-700/10 rounded-lg transition-colors ${mutedText}`}>
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Type a message..."
                className={`flex-1 bg-transparent outline-none ${textColor}`}
              />
              <button onClick={handleSendText} className={`p-2 bg-${accentColor}-600 text-white rounded-lg hover:bg-${accentColor}-700 transition-colors`}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`w-80 border-l ${borderColor} ${cardBg} overflow-y-auto hidden lg:block`}>
          <div className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => setActiveDrawer(action)}
                  className={`p-3 rounded-xl border ${borderColor} hover:border-${accentColor}-600 transition-all text-sm text-left`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`lg:hidden fixed bottom-6 right-6 p-4 bg-${accentColor}-600 text-white rounded-full shadow-lg z-40`}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div onClick={() => setIsSidebarOpen(false)} className="flex-1 bg-black/50" />
          <div className={`w-80 ${cardBg} p-6 overflow-y-auto`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">Quick Actions</h3>
              <button onClick={() => setIsSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => { setActiveDrawer(action); setIsSidebarOpen(false); }}
                  className={`p-3 rounded-xl border ${borderColor} hover:border-${accentColor}-600 transition-all text-sm text-left`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tool Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
          <div onClick={() => setActiveDrawer(null)} className="absolute inset-0 bg-black/50" />
          <div className={`relative ${cardBg} rounded-t-3xl lg:rounded-2xl w-full lg:w-[600px] max-h-[80vh] overflow-y-auto p-6`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">{activeDrawer}</h3>
              <button onClick={() => setActiveDrawer(null)} className={`p-2 hover:bg-gray-700/10 rounded-lg`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`p-8 border ${borderColor} rounded-xl text-center ${mutedText}`}>
              Tool interface for {activeDrawer}
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        window.__TAURI__ ? 
          <DesktopSettings onClose={() => setIsSettingsOpen(false)} /> :
          <Settings onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

export default App;
