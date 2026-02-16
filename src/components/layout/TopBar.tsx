import React from "react";
import { Mic, MicOff, Sun, Moon, Volume2, VolumeX, Settings } from "lucide-react";
import { AssistantStatus } from "../../../types";

interface TopBarProps {
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onToggleMic: () => void;
  isDark: boolean;
  isMuted: boolean;
  micStatus: AssistantStatus;
}

export function TopBar({
  onToggleTheme,
  onToggleSound,
  onOpenSettings,
  onToggleMic,
  isDark,
  isMuted,
  micStatus
}: TopBarProps) {
  const isListening = micStatus === AssistantStatus.LISTENING;
  const isSpeaking = micStatus === AssistantStatus.SPEAKING;
  const isActive = isListening || isSpeaking;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-50 border-b border-[var(--panel-border)]">
      <div className="h-full max-w-[1400px] mx-auto px-4 lg:px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--aura-core)] to-[var(--aura-violet)] flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-[var(--aura-core)] to-[var(--aura-violet)] bg-clip-text text-transparent">
            Aura
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMic}
            aria-label={isActive ? "Stop voice session" : "Start voice session"}
            className={`p-2.5 rounded-xl transition-all ${
              isActive
                ? "bg-[var(--aura-core)] text-white shadow-lg"
                : "hover:bg-[var(--panel-bg)]"
            } ${isListening ? "mic-pulse" : ""}`}
          >
            {isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" style={{ color: "var(--text-primary)" }} />}
          </button>

          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-xl hover:bg-[var(--panel-bg)] transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            )}
          </button>

          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-2.5 rounded-xl hover:bg-[var(--panel-bg)] transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            ) : (
              <Volume2 className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="p-2.5 rounded-xl hover:bg-[var(--panel-bg)] transition-colors"
          >
            <Settings className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
          </button>
        </div>
      </div>
    </header>
  );
}
