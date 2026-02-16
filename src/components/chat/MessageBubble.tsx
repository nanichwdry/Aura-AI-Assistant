import React from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end message-in">
        <div className="max-w-[70%] lg:max-w-[70%] px-4 py-3 rounded-2xl bg-gradient-to-r from-[var(--aura-core)] to-[var(--aura-violet)] text-white shadow-lg">
          <p className="text-sm leading-relaxed" style={{ color: "white" }}>{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start message-in">
      <div className="max-w-[70%] lg:max-w-[70%] px-4 py-3 rounded-2xl glass-panel border-l-2 border-[var(--aura-core)]">
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{content}</p>
      </div>
    </div>
  );
}
