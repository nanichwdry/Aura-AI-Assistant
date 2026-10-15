import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LiveAvatarSession, SessionEvent } from '@heygen/liveavatar-web-sdk';
import { API_BASE_URL } from '../config/api';

export interface AvatarStreamHandle {
  speak: (text: string) => boolean;
  interrupt: () => void;
}
interface Props {
  muted: boolean;
  onReady: (ready: boolean) => void;
  onError: (message: string) => void;
}

export const AvatarStream = forwardRef<AvatarStreamHandle, Props>(function AvatarStream(
  { muted, onReady, onError }, ref,
) {
  const video = useRef<HTMLVideoElement>(null);
  const session = useRef<LiveAvatarSession | null>(null);
  const ready = useRef(false);
  const [deviceToken, setDeviceToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  const callbacks = useRef({ onReady, onError });
  callbacks.current = { onReady, onError };

  useImperativeHandle(ref, () => ({
    speak(text) {
      if (!ready.current || !text.trim() || !session.current) return false;
      try { session.current.repeat(text); return true; }
      catch { callbacks.current.onError('Avatar speech failed. Standard chat is available.'); return false; }
    },
    interrupt() { if (ready.current) session.current?.interrupt(); },
  }), []);

  useEffect(() => () => { cancel.current?.(); }, []);

  const connect = async () => {
    cancel.current?.();
    const controller = new AbortController();
    let disposed = false;
    let active: LiveAvatarSession | null = null;
    const element = video.current;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      clearTimeout(timeout);
      ready.current = false;
      callbacks.current.onReady(false);
      active?.removeAllListeners();
      void active?.stop().catch(() => {});
      if (element) element.srcObject = null;
      session.current = null;
    };
    const fail = (message: string) => {
      if (disposed) return;
      cleanup();
      callbacks.current.onError(message);
    };
    const timeout = setTimeout(() => fail('Avatar connection timed out. Standard chat is available.'), 30000);
    cancel.current = cleanup;
    setConnecting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/avatar-token`, {
        method: 'POST', headers: { Authorization: `Bearer ${deviceToken.trim()}` },
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Avatar connection failed.');
      if (disposed) return;
      active = new LiveAvatarSession(data.sessionToken, { voiceChat: { defaultMuted: true } });
      session.current = active;
      active.on(SessionEvent.SESSION_DISCONNECTED, () => fail('Avatar disconnected. Standard chat is available.'));
      active.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (disposed || !element) return;
        active!.attach(element);
        clearTimeout(timeout);
        ready.current = true;
        callbacks.current.onReady(true);
        setConnecting(false);
        void element.play().catch(() => setPlayBlocked(true));
      });
      await active.start();
      // A late start must not resurrect a session after unmount or timeout.
      if (disposed) await active.stop().catch(() => {});
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Avatar connection failed.');
    }
  };

  return <section className="mx-auto w-full max-w-md rounded-xl border p-3 space-y-2" aria-label="Aura video avatar">
    <video ref={video} autoPlay playsInline muted={muted} className="w-full rounded-lg bg-black aspect-video" aria-label="Aura live video" />
    {!ready.current && !connecting && <div className="flex gap-2">
      <input type="password" autoComplete="off" aria-label="Paired device token" placeholder="Paired device token" value={deviceToken} onChange={e => setDeviceToken(e.target.value)} className="min-w-0 flex-1 rounded p-2 bg-gray-800 text-white" />
      <button disabled={!deviceToken.trim()} onClick={connect} className="rounded border p-2 disabled:opacity-50">Connect avatar</button>
    </div>}
    <p role="status" className="text-sm">{connecting ? 'Connecting to Aura video…' : ready.current ? 'Avatar connected' : 'Connect with your device pairing token.'}</p>
    {playBlocked && <button onClick={() => { void video.current?.play().then(() => setPlayBlocked(false)).catch(() => {}); }}>Play avatar audio/video</button>}
  </section>;
});
