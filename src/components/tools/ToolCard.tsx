import React from "react";
import { LucideIcon } from "lucide-react";

interface ToolCardProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function ToolCard({ icon: Icon, label, active, onClick }: ToolCardProps) {
  return (
    <button
      onClick={onClick}
      className={`group relative p-4 rounded-2xl border transition-all overflow-hidden ${
        active
          ? "border-[var(--aura-core)] bg-[var(--panel-strong)] shadow-lg shadow-[var(--aura-glow)]"
          : "border-[var(--panel-border)] hover:border-[var(--aura-core)] hover:bg-[var(--panel-bg)]"
      }`}
    >
      <div className="relative flex flex-col items-center gap-2">
        <Icon
          className={`w-5 h-5 transition-colors ${
            active ? "text-[var(--aura-core)]" : "group-hover:text-[var(--aura-core)]"
          }`}
          style={{ color: active ? "var(--aura-core)" : "var(--text-muted)" }}
        />
        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {label}
        </span>
      </div>
    </button>
  );
}
