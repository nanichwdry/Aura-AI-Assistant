import React from "react";
import { Send, Paperclip } from "lucide-react";

interface InputDockProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onAttach?: () => void;
  disabled?: boolean;
}

export function InputDock({ value, onChange, onSend, onAttach, disabled }: InputDockProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !disabled) {
      onSend();
    }
  };

  return (
    <div className="mt-4 p-4 glass-panel-strong">
      <div className="flex items-center gap-2">
        {onAttach && (
          <button
            onClick={onAttach}
            disabled={disabled}
            aria-label="Attach file"
            className="p-2 hover:bg-[var(--panel-bg)] rounded-lg transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        )}
        
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          placeholder="Enter command..."
          className="flex-1 px-4 py-3 bg-transparent outline-none focus:ring-2 focus:ring-[var(--aura-core)] rounded-xl transition-all"
          style={{ color: "var(--text-primary)" }}
        />
        
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="p-3 bg-gradient-to-r from-[var(--aura-core)] to-[var(--aura-violet)] text-white rounded-xl hover:shadow-lg hover:shadow-[var(--aura-glow)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
