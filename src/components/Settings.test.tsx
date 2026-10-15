import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Settings from '../../components/Settings';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('pairing confirmation uses the session ID returned by the server, not the display code', async () => {
  vi.stubGlobal('alert', vi.fn());
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith('/api/health')) return { ok: true };
    if (url.endsWith('/pair/start')) return { ok: true, json: async () => ({ pair_id: 'session-uuid', code: 'ABC123' }) };
    expect(JSON.parse(options!.body as string)).toEqual({ pair_id: 'session-uuid', code: 'ABC123', device_name: 'Desktop' });
    return { ok: true, json: async () => ({ device_token: 'device-secret' }) };
  });
  vi.stubGlobal('fetch', fetcher);
  render(<Settings onClose={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pair Device' }));
  await screen.findByText('ABC123');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  await screen.findByText('✓ Device Paired');
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
});
