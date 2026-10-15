import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: mocks.generate }; }, Type: { OBJECT: 'object', STRING: 'string' }, Modality: { AUDIO: 'audio' } }));
vi.mock('./AuraSketchpadDrawer', () => ({ AuraSketchpadDrawer: ({ onClose }: any) => <div role="dialog" aria-label="Sketchpad"><button onClick={onClose}>Close sketchpad</button></div> }));
import App from '../../App';
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubEnv('VITE_GEMINI_API_KEY', 'test-only');
  mocks.generate.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test('Sketchpad opens exactly once and closes without a leftover overlay', () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Sketchpad' })[0]);
  expect(screen.getAllByRole('dialog', { name: 'Sketchpad' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close sketchpad' }));
  expect(screen.queryByRole('dialog', { name: 'Sketchpad' })).toBeNull();
});
test('pending chat ignores repeat sends and unlocks after completion', async () => {
  let resolve!: (value: any) => void;
  mocks.generate.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<App />);
  const input = screen.getByRole('textbox', { name: 'Message Aura' });
  fireEvent.change(input, { target: { value: 'Hello' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  fireEvent.change(input, { target: { value: 'Repeated message' } });
  fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });
  expect(mocks.generate).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve({ text: 'Hello back' }));
  expect(await screen.findByText('Hello back')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled).toBe(false);
});

test('stopping during microphone permission releases the late stream', async () => {
  let deliver!: (stream: any) => void;
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn(() => new Promise(done => { deliver = done; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  vi.stubGlobal('AudioContext', class { state = 'running'; resume = async () => {}; close = async () => {}; });
  render(<App />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Start voice conversation' })));
  expect(getUserMedia).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Stop voice conversation' }));
  await act(async () => deliver({ getTracks: () => [{ stop: stopTrack }] }));
  expect(stopTrack).toHaveBeenCalledOnce();
});
