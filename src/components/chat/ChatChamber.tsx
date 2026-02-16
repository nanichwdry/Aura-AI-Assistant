import React from "react";
import { MessageBubble } from "./MessageBubble";
import { Message } from "../../types";

interface ChatChamberProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatChamber({ messages, messagesEndRef }: ChatChamberProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-4">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--aura-core)] to-[var(--aura-violet)] rounded-3xl blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-[var(--aura-core)] to-[var(--aura-violet)] rounded-3xl flex items-center justify-center shadow-2xl">
              <span className="text-3xl text-white font-bold">A</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-[var(--aura-core)] to-[var(--aura-violet)] bg-clip-text text-transparent">
            Neural Reactor Online
          </h2>
          <p style={{ color: "var(--text-muted)" }}>Awaiting command input...</p>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
