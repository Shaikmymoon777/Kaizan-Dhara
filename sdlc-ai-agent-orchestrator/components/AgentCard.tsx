import React from 'react';
import { AgentRole } from '../types';

interface AgentCardProps {
  role: AgentRole;
  isActive: boolean;
  status: 'idle' | 'processing' | 'done';
  icon: React.ReactNode;
  description: string;
}

const AgentCard: React.FC<AgentCardProps> = ({
  role,
  isActive,
  status,
  icon,
  description,
}) => {
  return (
    <div
      className={`
        relative p-4 rounded-2xl border transition-all duration-700 ease-out overflow-hidden
        ${isActive
          ? 'bg-white/[0.03] border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.15)] scale-[1.02]'
          : 'bg-black/20 border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 hover:border-white/10'
        }
      `}
    >
      {/* Photon Sphere Glow (Active only) */}
      {isActive && (
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/20 blur-[40px] rounded-full animate-pulse" />
      )}

      {/* Scanning Line Animation */}
      {status === 'processing' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan" />
        </div>
      )}

      <div className="relative flex items-center gap-4">
        {/* Artifact Icon Container */}
        <div className={`
          relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
          transition-all duration-500 border
          ${isActive
            ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)] scale-110'
            : 'bg-white/5 border-white/10 text-slate-500'
          }
        `}>
          {/* Signal Pulse for Processing */}
          {status === 'processing' && (
            <div className="absolute inset-0 rounded-xl bg-indigo-400 animate-ping opacity-40" />
          )}

          <div className={`relative z-10 ${isActive ? 'text-white' : 'text-slate-400'} scale-110`}>
            {icon}
          </div>
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`
              font-black text-[10px] tracking-[0.2em] uppercase italic
              transition-colors duration-500
              ${isActive ? 'text-white' : 'text-slate-500'}
            `}>
              {role}
            </h3>

            {/* Systems Status Labels */}
            <div className="flex items-center gap-2">
              {status === 'processing' && (
                <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                    Flowing
                  </span>
                </div>
              )}

              {status === 'done' && (
                <div className="flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                    Nominal
                  </span>
                </div>
              )}
            </div>
          </div>

          <p className={`
            text-[11px] font-medium leading-snug tracking-tight
            transition-colors duration-500
            ${isActive ? 'text-slate-300' : 'text-slate-600'}
          `}>
            {description}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-10px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
        
        .animate-scan {
          animation: scan 3s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AgentCard;