import { getDeviceToken, setDeviceToken } from '../src/lib/deviceSession';
import { API_BASE_URL } from '../src/config/api';
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Wifi, WifiOff, Check } from 'lucide-react';

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [serverUrl, setServerUrl] = useState(API_BASE_URL);
  const [connected, setConnected] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const [pairId, setPairId] = useState('');
  const [pairing, setPairing] = useState(false);
  const [token, setToken] = useState(getDeviceToken);

  useEffect(() => {
    if (window.__TAURI__) {
      window.__TAURI__.invoke('get_config').then((config: any) => {
        setServerUrl(config.server_url || 'http://localhost:3001');
        setToken(config.device_token || '');
      });
    }
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/health`);
      setConnected(res.ok);
    } catch {
      setConnected(false);
    }
  };

  const startPairing = async () => {
    setPairing(true);
    try {
      const res = await fetch(`${serverUrl}/pair/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.pair_id || !data.code) throw new Error(data.error || "Pairing failed");
      setPairId(data.pair_id);
      setPairCode(data.code);
    } catch (error) {
      alert('Failed to start pairing');
      setPairing(false);
    }
  };

  const confirmPairing = async () => {
    try {
      const res = await fetch(`${serverUrl}/pair/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair_id: pairId, code: pairCode, device_name: 'Desktop' })
      });
      const data = await res.json();
      if (!res.ok || !data.device_token) throw new Error(data.error || "Pairing failed");
      setToken(data.device_token);
      setDeviceToken(data.device_token);
      
      if (window.__TAURI__) {
        await window.__TAURI__.invoke('save_config', { 
          server_url: serverUrl, 
          device_token: data.device_token 
        });
      }
      
      setPairing(false);
      setPairCode('');
      setPairId('');
      alert('Device paired successfully!');
    } catch (error) {
      alert('Failed to confirm pairing');
    }
  };

  const saveSettings = async () => {
    if (window.__TAURI__) {
      await window.__TAURI__.invoke('save_config', { server_url: serverUrl, device_token: token });
    }
    checkConnection();
    alert('Settings saved!');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-[500px] max-h-[90dvh] overflow-y-auto border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Aura Settings</h2>
          </div>
          <button aria-label="Close settings" onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-400 mb-2">Core Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white"
              placeholder="http://localhost:3001"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl">
            {connected ? <Wifi className="w-5 h-5 text-green-500" /> : <WifiOff className="w-5 h-5 text-red-500" />}
            <span className="text-sm font-bold">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>

          {!token && (
            <div>
              <button
                onClick={startPairing}
                disabled={pairing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                {pairing ? 'Pairing...' : 'Pair Device'}
              </button>
              {pairCode && (
                <div className="mt-4 p-4 bg-blue-600/20 border border-blue-500/50 rounded-xl text-center">
                  <p className="text-sm text-zinc-400 mb-2">Pairing Code:</p>
                  <p className="text-3xl font-black text-blue-400 tracking-widest">{pairCode}</p>
                  <button
                    onClick={confirmPairing}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Confirm
                  </button>
                </div>
              )}
            </div>
          )}

          {token && (
            <div className="p-4 bg-green-600/20 border border-green-500/50 rounded-xl">
              <p className="text-sm text-green-400 font-bold">✓ Device Paired</p>
              <button onClick={() => { void navigator.clipboard.writeText(token).catch(() => alert("Clipboard is unavailable in this browser.")); }} className="mt-2 text-sm underline">Copy device token for Avatar mode</button>
            </div>
          )}

          <button
            onClick={saveSettings}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
