import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useWakeWord, wakeCommand } from './useWakeWord';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('recognizes the wake phrase without matching unrelated words', () => {
  expect(wakeCommand('Hey Aura')).toBe('');
  expect(wakeCommand('hey, aura, explain this')).toBe('explain this');
  expect(wakeCommand('the aurora is bright')).toBeNull();
});
test('listener is opt-in, wakes once, and releases recognition when paused', () => {
  let recognition: any;
  class Recognition { start = vi.fn(); abort = vi.fn(); constructor() { recognition = this; } }
  vi.stubGlobal('SpeechRecognition', Recognition);
  const onWake = vi.fn();
  const { rerender } = renderHook(({ enabled, paused }) => useWakeWord({ enabled, paused, onWake, onError: vi.fn() }), { initialProps: { enabled: false, paused: false } });
  expect(recognition).toBeUndefined();
  rerender({ enabled: true, paused: false });
  expect(recognition.start).toHaveBeenCalledOnce();
  act(() => {
    recognition.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Aura' }]] });
    recognition.onresult({ resultIndex: 0, results: [[{ transcript: 'Hey Aura' }]] });
  });
  expect(onWake).toHaveBeenCalledOnce();
  rerender({ enabled: true, paused: true });
  expect(recognition.onresult).toBeNull();
  expect(recognition.abort).toHaveBeenCalled();
});
test('permission failures are reported rather than silently restarting', () => {
  let recognition: any;
  vi.stubGlobal('SpeechRecognition', class { start() {} abort() {} constructor() { recognition = this; } });
  const onError = vi.fn();
  renderHook(() => useWakeWord({ enabled: true, paused: false, onWake: vi.fn(), onError }));
  act(() => recognition.onerror({ error: 'not-allowed' }));
  expect(onError).toHaveBeenCalledOnce();
});
