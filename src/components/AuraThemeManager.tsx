import React from 'react';
import { X, Palette, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const THEMES = [
  { id: 'dark', name: 'Dark Mode', colors: ['#0f172a', '#1e293b', '#334155'] },
  { id: 'light', name: 'Light Mode', colors: ['#f8fafc', '#e2e8f0', '#cbd5e1'] },
  { id: 'blue', name: 'Ocean Blue', colors: ['#0c4a6e', '#0369a1', '#0ea5e9'] },
  { id: 'purple', name: 'Purple Haze', colors: ['#581c87', '#7e22ce', '#a855f7'] },
  { id: 'green', name: 'Forest Green', colors: ['#14532d', '#15803d', '#22c55e'] },
  { id: 'rose', name: 'Rose Gold', colors: ['#881337', '#be123c', '#f43f5e'] }
];

export function AuraThemeManager({ onClose, currentTheme, onThemeChange }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-lg text-gray-100">Theme Manager</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-400 mb-6">Choose your preferred color theme for Aura</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`relative p-4 rounded-xl border transition-all ${
                  currentTheme === theme.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-100">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <Check className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                
                <div className="flex gap-2">
                  {theme.colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="flex-1 h-12 rounded-lg"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
