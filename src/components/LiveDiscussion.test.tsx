import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { LiveDiscussion, LiveDiscussionHandle } from './LiveDiscussion';
import { setDeviceToken } from '../lib/deviceSession';
const mocks = vi.hoisted(() => ({ instances: [] as any[], lateStart: null as null | (() => Promise<void>) }));
vi.mock('@heygen/liveavatar-web-sdk', () => ({
  SessionEvent: { SESSION_STREAM_READY: 'ready', SESSION_DISCONNECTED: 'disconnected' },
  AgentEventsEnum: { USER_TRANSCRIPTION: 'userText', AVATAR_TRANSCRIPTION: 'auraText', USER_SPEAK_STARTED: 'userStart', USER_SPEAK_ENDED: 'userEnd', AVATAR_SPEAK_STARTED: 'auraStart', AVATAR_SPEAK_ENDED: 'auraEnd', SESSION_STOPPED: 'stopped' },
  LiveAvatarSession: class {
    events: Record<string, Function> = {};
    voiceChat = { state: 'ACTIVE', stop: vi.fn(), mute: vi.fn(async () => {}), unmute: vi.fn(async () => {}) };
    stop = vi.fn(async () => {}); attach = vi.fn(); message = vi.fn(); repeat = vi.fn(); interrupt = vi.fn();
    constructor() { mocks.instances.push(this); }
    on(name: string, fn: Function) { this.events[name] = fn; }
    removeAllListeners() { this.events = {}; }
    async start() { if (mocks.lateStart) await mocks.lateStart(); this.events.ready?.(); }
  },
}));
beforeEach(() => {
  setDeviceToken('paired'); mocks.instances = []; mocks.lateStart = null;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ sessionToken: 'temporary' }) })));
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => { cleanup(); setDeviceToken(''); vi.unstubAllGlobals(); });
async function connect() {
  const onTranscript = vi.fn(); const onReady = vi.fn(); const ref = React.createRef<LiveDiscussionHandle>();
  const rendered = render(<LiveDiscussion ref={ref} muted={false} onTranscript={onTranscript} onReady={onReady} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
  await screen.findByText('Listening. Speak naturally.');
  return { onTranscript, onReady, ref, ...rendered };
}
test('voice/video views share one call; speech can interrupt; ending releases the microphone', async () => {
  const { onTranscript, onReady } = await connect();
  const session = mocks.instances[0];
  expect(JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)).toEqual({ conversation: true });
  expect(session.repeat).toHaveBeenCalledWith("I'm here. How can I help?");
  fireEvent.click(screen.getByRole('button', { name: 'Video' }));
  fireEvent.click(screen.getByRole('button', { name: 'Voice' }));
  expect(mocks.instances).toHaveLength(1);
  act(() => {
    session.events.userStart();
    session.events.userText({ event_id: '1', text: 'Hello Aura' });
    session.events.auraText({ event_id: '2', text: 'Hello there' });
    session.events.auraText({ event_id: '2', text: 'Hello there' });
  });
  expect(session.interrupt).toHaveBeenCalledOnce();
  expect(onTranscript.mock.calls).toEqual([['user', 'Hello Aura'], ['assistant', 'Hello there']]);
  fireEvent.click(screen.getByRole('button', { name: 'End call' }));
  expect(session.voiceChat.stop).toHaveBeenCalledOnce();
  expect(session.stop).toHaveBeenCalledOnce();
  expect(onReady).toHaveBeenLastCalledWith(false);
});
test('typed input and mic mute use the live call rather than a second response engine', async () => {
  const { ref, onTranscript } = await connect();
  act(() => expect(ref.current!.send('Tell me a story')).toBe(true));
  expect(mocks.instances[0].message).toHaveBeenCalledWith('Tell me a story');
  expect(onTranscript).toHaveBeenCalledWith('user', 'Tell me a story');
  fireEvent.click(screen.getByRole('button', { name: 'Mute mic' }));
  await screen.findByRole('button', { name: 'Unmute mic' });
  expect(mocks.instances[0].voiceChat.mute).toHaveBeenCalledOnce();
});
test('wake phrase starts a call once after explicit enable', async () => {
  let recognition: any;
  vi.stubGlobal('SpeechRecognition', class { start() {} abort() {} constructor() { recognition = this; } });
  render(<LiveDiscussion muted={false} onTranscript={vi.fn()} onReady={vi.fn()} />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Enable Hey Aura' }));
  act(() => recognition.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Aura' }]] }));
  await screen.findByText('Listening. Speak naturally.');
  expect(fetch).toHaveBeenCalledOnce();
});
test('backend configuration errors leave text fallback and retry controls available', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Configure AVATAR_CONTEXT_ID' }) } as Response);
  render(<LiveDiscussion muted={false} onTranscript={vi.fn()} onReady={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Configure AVATAR_CONTEXT_ID');
  expect(screen.getByRole('button', { name: 'Start conversation' })).toBeTruthy();
});
test('ending while start is pending prevents late microphone resurrection', async () => {
  let finish!: () => void;
  mocks.lateStart = () => new Promise<void>(resolve => { finish = resolve; });
  render(<LiveDiscussion muted={false} onTranscript={vi.fn()} onReady={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
  await waitFor(() => expect(mocks.instances).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: 'End call' }));
  await act(async () => finish());
  expect(mocks.instances[0].voiceChat.stop).toHaveBeenCalled();
  expect(mocks.instances[0].repeat).not.toHaveBeenCalled();
});
