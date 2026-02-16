import React from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function FounderProfile({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Futuristic background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-cyan-950/20" />
      
      {/* Particle effects */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.6
            }}
          />
        ))}
      </div>
      
      {/* Glass card */}
      <div className="relative backdrop-blur-xl bg-slate-900/40 border border-cyan-500/30 rounded-3xl p-8 lg:p-12 shadow-2xl max-w-5xl w-full" style={{ boxShadow: '0 0 60px rgba(6, 182, 212, 0.3), 0 0 120px rgba(139, 92, 246, 0.2)' }}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
        
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left: Founder Image */}
          <div className="relative flex-shrink-0 mx-auto lg:mx-0">
            <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
              {/* Circuit pattern overlay */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-cyan-500 to-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.1) 2px, rgba(6, 182, 212, 0.1) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 92, 246, 0.1) 2px, rgba(139, 92, 246, 0.1) 4px)' }} />
              <img
                src="/Mukharji Vajje.png"
                alt="Mukharji Vajje"
                className="relative w-full h-full object-cover"
                style={{ filter: 'brightness(1.1) contrast(1.05)' }}
              />
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent" />
            </div>
            
            {/* Certifications */}
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-semibold text-purple-300 mb-3">Certifications</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>Generative AI for Developers | Microsoft</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>Cloud Generative AI | Google</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>Prompt Engineering | Coursera</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  <span>AI and Career Empowerment | University of Maryland</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Content */}
          <div className="flex-1 space-y-6">
            {/* Name */}
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3" style={{ textShadow: '0 0 30px rgba(6, 182, 212, 0.5)' }}>
                Mukharji Vajje
              </h2>
              <p className="text-cyan-400 text-lg lg:text-xl">Senior UI Developer | AI-Integrated Frontend Engineer</p>
            </div>
            
            {/* About */}
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-purple-300 mb-3">About the Founder</h3>
              <p className="text-gray-300 leading-relaxed">
                With a passion for Artificial Intelligence, Mukharji is dedicated to bridging the gap between complex technology and intuitive user experiences.
              </p>
              <p className="text-gray-300 leading-relaxed mt-3">
                Driven by the vision of making AI more accessible and personalized, he founded AURA to redefine how we interact with our digital environments. His work focuses on creating seamless, agentic systems that don't just process commands, but actively assist in a way that feels natural and human-centric.
              </p>
            </div>
            
            {/* Vision */}
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-purple-300 mb-3">Why I Built AURA</h3>
              <blockquote className="italic text-white/90 leading-relaxed border-l-4 border-cyan-500 pl-4 lg:pl-6" style={{ textShadow: '0 0 20px rgba(255, 255, 255, 0.1)' }}>
                "Creating AURA was not just about building an AI assistant, but about crafting a digital companion that understands, learns, and evolves with you. In a world flooded with tools, I saw a need for a single, cohesive presence where voice, text, and utility converge to create a truly intelligent personal companion."
              </blockquote>
            </div>
            
            {/* AURA Logo */}
            <div className="flex justify-end pt-4">
              <img src="/Aura AI logo.png" alt="AURA" className="w-20 h-20 opacity-60" />
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
