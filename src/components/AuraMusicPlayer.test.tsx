import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { AuraMusicPlayer } from './AuraMusicPlayer';

const state = vi.hoisted(() => ({ players: [] as any[], events: null as any }));
vi.mock('../lib/youtube', () => ({ loadYouTube: async () => ({ Player: class {
  loadVideoById = vi.fn(); playVideo = vi.fn(); pauseVideo = vi.fn(); destroy = vi.fn();
  constructor(_element: unknown, options: any) {
    state.events = options.events;
    state.players.push(this);
    queueMicrotask(() => options.events.onReady());
  }
} }) }));
const songs = [
  { videoId: 'one', title: 'First song', channel: 'Artist', thumbnail: '' },
  { videoId: 'two', title: 'Second song', channel: 'Artist', thumbnail: '' },
  { videoId: 'three', title: 'Third song', channel: 'Artist', thumbnail: '' },
];
beforeEach(() => {
  state.players = [];
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, videos: songs }) })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Wrapper() {
  const [minimized, setMinimized] = React.useState(false);
  const [open, setOpen] = React.useState(true);
  return <><button onClick={() => { setOpen(true); setMinimized(false); }}>Open Music tool</button>{open && <AuraMusicPlayer minimized={minimized} onMinimize={() => setMinimized(true)} onRestore={() => setMinimized(false)} onClose={() => setOpen(false)} />}</>;
}
async function startMusic() {
  render(<Wrapper />);
  await waitFor(() => expect(screen.queryByText('Connecting to YouTube…')).toBeNull());
  fireEvent.change(screen.getByRole('textbox', { name: 'Search for songs' }), { target: { value: 'music' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search music' }));
  await screen.findByText('First song');
}
test('minimize, pause, restore and close retain one player and stop it on close', async () => {
  await startMusic();
  expect(state.players).toHaveLength(1);
  expect(state.players[0].loadVideoById).toHaveBeenCalledWith('one');
  act(() => state.events.onStateChange({ data: 1 }));
  fireEvent.click(screen.getByRole('button', { name: 'Minimize music player' }));
  expect(screen.getByRole('region', { name: 'Mini music player' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pause song' }));
  expect(state.players[0].pauseVideo).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Restore music player' }));
  expect(screen.getByRole('dialog', { name: 'Music player' })).toBeTruthy();
  expect(screen.getByText('First song')).toBeTruthy();
  expect(state.players).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close music player and stop playback' }));
  expect(state.players[0].destroy).toHaveBeenCalledOnce();
});
test('Music tool restores minimized player without resetting playlist', async () => {
  await startMusic();
  fireEvent.click(screen.getByRole('button', { name: 'Minimize music player' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Music tool' }));
  expect(screen.getByRole('dialog', { name: 'Music player' })).toBeTruthy();
  expect(state.players).toHaveLength(1);
});
test('closing minimized player destroys audio and reopening starts clean', async () => {
  await startMusic();
  fireEvent.click(screen.getByRole('button', { name: 'Minimize music player' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close music player and stop playback' }));
  expect(state.players[0].destroy).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Open Music tool' }));
  await waitFor(() => expect(state.players).toHaveLength(2));
  expect(screen.queryByText('First song')).toBeNull();
});
test('end-of-song callback advances using the current playlist index', async () => {
  await startMusic();
  fireEvent.click(screen.getByRole('button', { name: 'Next song' }));
  act(() => state.events.onStateChange({ data: 0 }));
  expect(state.players[0].loadVideoById).toHaveBeenLastCalledWith('three');
});
test('search failures are visible and player remains closable', async () => {
  await startMusic();
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Backend offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Search music' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Backend offline');
  fireEvent.click(screen.getByRole('button', { name: 'Close music player and stop playback' }));
  expect(state.players[0].destroy).toHaveBeenCalledOnce();
});
