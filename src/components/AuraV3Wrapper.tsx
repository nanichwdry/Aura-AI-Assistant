import React, { PropsWithChildren } from 'react';
import '../styles/aura-3.css';

export default function AuraV3Wrapper({ children }: PropsWithChildren<{}>) {
  return (
    <div className="aura-3-root min-h-screen w-full">
      {children}
    </div>
  );
}
