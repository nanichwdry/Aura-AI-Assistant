import React from "react";

type Props = {
  isSpeaking: boolean;
};

export function AuraAvatar({ isSpeaking }: Props) {
  return (
    <div className="relative w-64 h-64 rounded-3xl overflow-hidden">
      <img
        src="/aura-face.png"
        alt="Aura"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
