import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from '@heygen/liveavatar-web-sdk';
import { Mic, MicOff, PhoneOff, Video, Volume2 } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { getDeviceToken, setDeviceToken } from '../lib/deviceSession';
import { useWakeWord } from '../hooks/useWakeWord';

export interface LiveDiscussionHandle { send(text: string): boolean; end(): void }
interface Props {
  muted: boolean;
  onTranscript: (role: 'user' | 'assistant', text: string) => void;
  onReady: (ready: boolean) => void;
}
type CallState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export const LiveDiscussion = forwardRef<LiveDiscussionHandle, Props>(function LiveDiscussion({ muted, onTranscript, onReady }, ref) {
  const [view, setView] = useState<'voice' | 'video'>('voice');
  const [token, setToken] = useState(getDeviceToken);
  const [state, setState] = useState<CallState>('idle');
  const [micMuted, setMicMuted] = useState(false);
  const [error, setError] = useState('');
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef<LiveAvatarSession | null>(null);
  const ready = useRef(false);
  const starting = useRef(false);
  const cancel = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onTranscript, onReady });
  callbacks.current = { onTranscript, onReady };
  const busy = state !== 'idle';

  const end = () => { cancel.current?.(); setWakeEnabled(false); };
  const send = (text: string) => {
    if (!ready.current || !text.trim()) return false;
    try {
      active.current!.message(text);
      callbacks.current.onTranscript('user', text);
      setState('thinking');
      return true;
    } catch { setError('Message could not be sent. End the call and reconnect.'); return false; }
  };
  useImperativeHandle(ref, () => ({ send, end }));
  useEffect(() => () => cancel.current?.(), []);

  const start = async (command = '') => {
    if (active.current || starting.current) return;
    if (!token.trim()) { setError('Pair your device in Settings first, then enter its token.'); setWakeEnabled(false); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError('Live discussion needs microphone access on HTTPS or localhost.'); setWakeEnabled(false); return;
    }
    starting.current = true;
    setDeviceToken(token.trim());
    setError(''); setBlocked(false); setMicMuted(false); setState('connecting');
    const controller = new AbortController();
    let disposed = false;
    let session: LiveAvatarSession | null = null;
    let cancelWait: () => void = () => {};
    const element = video.current;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      controller.abort(); cancelWait(); clearTimeout(timeout); clearTimeout(duration);
      ready.current = false; starting.current = false;
      callbacks.current.onReady(false);
      session?.removeAllListeners();
      session?.voiceChat.stop();
      void session?.stop().catch(() => {});
      active.current = null;
      if (element) element.srcObject = null;
      setState('idle'); setMicMuted(false);
    };
    const fail = (message: string) => {
      if (disposed) return;
      cleanup(); setWakeEnabled(false); setError(message);
    };
    const timeout = setTimeout(() => fail('Connection timed out. You can keep using text chat and try again.'), 30000);
    let duration: ReturnType<typeof setTimeout>;
    cancel.current = cleanup;
    try {
      const response = await fetch(`${API_BASE_URL}/api/avatar-token`, {
        method: 'POST', headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation: true }), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Live discussion could not start.');
      if (disposed) return;
      session = new LiveAvatarSession(data.sessionToken, { voiceChat: { defaultMuted: true } });
      active.current = session;
      const streamReady = new Promise<void>(resolve => {
        cancelWait = resolve;
        session!.on(SessionEvent.SESSION_STREAM_READY, () => {
          if (disposed || !element) return;
          session!.attach(element);
          void element.play().catch(() => { if (!disposed) setBlocked(true); });
          resolve();
        });
      });
      const seen = new Set<string>();
      const transcript = (role: 'user' | 'assistant', event: { event_id: string; text: string }) => {
        if (disposed || !event.text?.trim() || seen.has(event.event_id)) return;
        seen.add(event.event_id);
        callbacks.current.onTranscript(role, event.text);
      };
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, event => transcript('user', event));
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, event => transcript('assistant', event));
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => {
        if (!disposed && ready.current) { session!.interrupt(); setState('listening'); }
      });
      session.on(AgentEventsEnum.USER_SPEAK_ENDED, () => { if (!disposed && ready.current) setState('thinking'); });
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => { if (!disposed && ready.current) setState('speaking'); });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => { if (!disposed && ready.current) setState('listening'); });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => fail('The live call ended. Text chat is available. You can start another call.'));
      session.on(AgentEventsEnum.SESSION_STOPPED, () => fail('The provider ended the live call. You can start another call.'));
      await session.start();
      if (disposed) { session.voiceChat.stop(); await session.stop().catch(() => {}); return; }
      await streamReady;
      if (disposed) return;
      // The SDK logs microphone failures rather than throwing from start(). Check it explicitly.
      if (session.voiceChat.state !== 'ACTIVE') throw new Error('Microphone could not start. Allow microphone access and try again.');
      await session.voiceChat.unmute();
      if (disposed) { session.voiceChat.stop(); return; }
      clearTimeout(timeout);
      ready.current = true; starting.current = false; callbacks.current.onReady(true); setState('listening');
      duration = setTimeout(() => fail('The five-minute call limit was reached. Start another call to continue.'), 300000);
      if (command) { session.message(command); callbacks.current.onTranscript('user', command); }
      else session.repeat("I'm here. How can I help?");
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Live discussion failed. Text chat is available.');
    }
  };
  const wake = useWakeWord({
    enabled: wakeEnabled, paused: busy,
    onWake: command => { void start(command); },
    onError: message => { setWakeEnabled(false); setError(message); },
  });
  const toggleMic = async () => {
    if (!ready.current || !active.current) return;
    try {
      if (micMuted) await active.current.voiceChat.unmute();
      else await active.current.voiceChat.mute();
      setMicMuted(value => !value);
    } catch { setError('Could not change the microphone. End the call and reconnect.'); }
  };

  return <section className="live-discussion" aria-label="Live discussion with Aura">
    <div className="live-discussion-heading"><div><strong>Talk with Aura</strong><p>An AI conversation, at your pace.</p></div><div className="live-discussion-views">
      <button aria-pressed={view === 'voice'} onClick={() => setView('voice')}><Volume2 size={15} /> Voice</button>
      <button aria-pressed={view === 'video'} onClick={() => setView('video')}><Video size={15} /> Video</button>
    </div></div>
    <video ref={video} autoPlay playsInline muted={muted} aria-label="Aura live conversation video" className={view === 'video' ? 'live-discussion-video' : 'live-discussion-audio-only'} />
    {view === 'voice' && <div className={`live-discussion-wave ${state === 'speaking' ? 'is-speaking' : ''}`} aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <i key={index} style={{ height: `${8 + (index % 5) * 5}px`, animationDelay: `${index * .08}s` }} />)}</div>}
    {state === 'idle' && <label className="live-discussion-token">Paired device token<input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} placeholder="Pair in Settings or paste your token" /></label>}
    <p role="status" aria-live="polite">{state === 'idle' ? wake.listening ? 'Listening for “Hey Aura”…' : wakeEnabled ? 'Hey Aura enabled. Listening pauses when the tab is hidden.' : 'Ready to connect' : state === 'connecting' ? 'Connecting microphone and stream…' : micMuted ? 'Microphone muted' : state === 'speaking' ? 'Aura is speaking. You can interrupt.' : state === 'thinking' ? 'Aura is thinking…' : 'Listening. Speak naturally.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="live-discussion-controls">
      {!busy ? <button disabled={!token.trim()} onClick={() => { void start(); }}><Mic size={16} /> Start conversation</button> : <>
        <button disabled={state === 'connecting'} onClick={() => { void toggleMic(); }}>{micMuted ? <Mic size={16} /> : <MicOff size={16} />}{micMuted ? 'Unmute mic' : 'Mute mic'}</button>
        <button onClick={end}><PhoneOff size={16} /> End call</button>
      </>}
      <button aria-pressed={wakeEnabled} disabled={!wake.supported || !token.trim() || busy} onClick={() => { setError(''); setWakeEnabled(value => !value); }}>{wakeEnabled ? 'Disable Hey Aura' : 'Enable Hey Aura'}</button>
      {blocked && <button onClick={() => { void video.current?.play().then(() => setBlocked(false)).catch(() => setError('Browser blocked playback. Check site audio permissions.')); }}>Play Aura audio</button>}
    </div>
    <p className="live-discussion-note">{wake.supported ? 'Hey Aura uses browser speech recognition while this tab is visible. Your browser may process speech online.' : 'Hey Aura is unavailable in this browser. Use Start conversation.'} Voice and video use the same LiveAvatar session. Calls use provider credits outside sandbox.</p>
  </section>;
});
