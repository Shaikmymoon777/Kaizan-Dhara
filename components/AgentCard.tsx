
import React from 'react';
import { motion } from 'framer-motion';
import { AgentRole } from '../types';

interface AgentCardProps {
  role: AgentRole;
  isActive: boolean;
  status: 'idle' | 'processing' | 'done';
  icon: React.ReactNode;
  description: string;
  isWaitingForApproval?: boolean;
  onApprove?: () => void;
  onRemodify?: (feedback: string) => void;
  onClick?: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  role,
  isActive,
  status,
  icon,
  description,
  isWaitingForApproval,
  onApprove,
  onRemodify,
  onClick
}) => {
  const [isRemodifying, setIsRemodifying] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');

  const handleRemodifySubmit = () => {
    if (feedback.trim() && onRemodify) {
      onRemodify(feedback);
      setIsRemodifying(false);
      setFeedback('');
    }
  };

  return (
    <motion.div
      onClick={(e) => {
        // Prevent click if clicking buttons or textarea
        if ((e.target as HTMLElement).closest('button, textarea')) return;
        onClick?.();
      }}
      initial={false}
      animate={{
        backgroundColor: isActive ? "rgba(79, 70, 229, 0.1)" : "rgba(15, 23, 42, 0.4)",
        borderColor: isActive ? "rgba(99, 102, 241, 0.5)" : "rgba(30, 41, 59, 0.5)",
        scale: isActive ? 1.02 : 1,
        boxShadow: isActive ? "0 0 20px rgba(79, 70, 229, 0.15)" : "none",
        cursor: onClick ? 'pointer' : 'default'
      }}
      className={`relative p-5 rounded-2xl border backdrop-blur-sm transition-all duration-500 overflow-hidden group`}
    >
      {/* Active Ambient Glow */}
      <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'group-hover:opacity-50'}`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition-colors duration-500 ${isActive
              ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/30'
              : 'bg-slate-800/50 text-slate-500 border-slate-700 group-hover:bg-slate-800 group-hover:text-slate-300'
              }`}>
              {icon}
            </div>
            <div>
              <h3 className={`text-xs font-black tracking-[0.1em] uppercase transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {role} Agent
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className={`text-[9px] font-bold tracking-widest uppercase ${isActive ? 'text-indigo-300' : 'text-slate-600'}`}>
                  {status === 'processing' ? 'ACTIVE_THREAD' : status === 'done' ? 'TASK_COMPLETE' : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>

          {status === 'processing' && (
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            </div>
          )}
          {status === 'done' && !isWaitingForApproval && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
            </motion.div>
          )}
        </div>

        <p className={`text-[11px] leading-relaxed transition-colors duration-300 ${isActive ? 'text-indigo-200/80' : 'text-slate-500 group-hover:text-slate-400'}`}>
          {description}
        </p>

        {/* Approval / Remodify Actions */}
        {isWaitingForApproval && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-slate-700/50"
          >
            {!isRemodifying ? (
              <div className="flex gap-2">
                <button
                  onClick={onApprove}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Approve
                </button>
                <button
                  onClick={() => setIsRemodifying(true)}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Remodify
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe required changes..."
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none h-16"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsRemodifying(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRemodifySubmit}
                    disabled={!feedback.trim()}
                    className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Progress Line for Active State */}
        {isActive && (
          <motion.div
            layoutId="active-line"
            className="absolute -bottom-5 -left-5 -right-5 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"
          />
        )}
      </div>
    </motion.div>
  );
};

export default AgentCard;
