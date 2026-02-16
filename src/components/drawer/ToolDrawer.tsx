import React from "react";
import { X, LucideIcon } from "lucide-react";

interface ToolDrawerProps {
  open: boolean;
  title: string;
  icon?: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
}

export function ToolDrawer({ open, title, icon: Icon, onClose, children }: ToolDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 drawer-backdrop"
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full lg:w-[680px] lg:max-w-[680px] max-h-[85vh] glass-panel-strong border border-[var(--panel-border)] overflow-hidden shadow-2xl ${
          window.innerWidth >= 1024 ? "drawer-enter-right rounded-l-3xl" : "drawer-enter-bottom rounded-t-3xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--panel-border)]">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--aura-core)] to-[var(--aura-violet)] bg-opacity-10">
                <Icon className="w-5 h-5" style={{ color: "var(--aura-core)" }} />
              </div>
            )}
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 hover:bg-[var(--panel-bg)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(85vh-80px)] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
