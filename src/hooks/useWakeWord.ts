import { useEffect, useRef, useState } from 'react';

interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  start(): void; abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function wakeCommand(text: string): string | null {
  const match = text.match(/\bhey[\s,]+aura\b[\s,.!?]*(.*)/i);
  return match ? match[1].trim() : null;
}
export function useWakeWord({ enabled, paused, onWake, onError }: {
  enabled: boolean; paused: boolean; onWake: (command: string) => void; onError: (message: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState !== 'hidden');
  const callbacks = useRef({ onWake, onError });
  callbacks.current = { onWake, onError };
  const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  useEffect(() => {
    const changed = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  useEffect(() => {
    if (!enabled || paused || !visible || !Constructor) { setListening(false); return; }
    const recognition = new Constructor();
    let disposed = false;
    let triggered = false;
    let fatal = false;
    let restart: ReturnType<typeof setTimeout>;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    const fail = () => {
      fatal = true;
      setListening(false);
      callbacks.current.onError('Hey Aura listening stopped. Check microphone permission and your connection, then enable it again.');
    };
    const start = () => { if (!disposed && !triggered && !fatal) { try { recognition.start(); } catch { fail(); } } };
    recognition.onstart = () => { if (!disposed) setListening(true); };
    recognition.onend = () => {
      if (disposed) return;
      setListening(false);
      if (!triggered && !fatal) restart = setTimeout(start, 500);
    };
    recognition.onerror = ({ error }) => {
      if (!disposed && error !== 'no-speech' && error !== 'aborted') fail();
    };
    recognition.onresult = event => {
      if (disposed || triggered) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const command = wakeCommand(event.results[i][0]?.transcript || '');
        if (command !== null) {
          triggered = true;
          setListening(false);
          recognition.abort();
          callbacks.current.onWake(command);
          break;
        }
      }
    };
    start();
    return () => {
      disposed = true;
      clearTimeout(restart);
      recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
      recognition.abort();
      setListening(false);
    };
  }, [enabled, paused, visible, Constructor]);
  return { supported: !!Constructor, listening };
}
