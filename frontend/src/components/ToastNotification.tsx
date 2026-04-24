import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'agent-complete';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  agentName?: string;
  duration?: number; // ms, default 8000
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

// ── Styling Config ────────────────────────────────────────────────────────────
const TOAST_STYLES: Record<ToastType, {
  bg: string;
  border: string;
  icon: string;
  iconBg: string;
  progressColor: string;
  titleColor: string;
}> = {
  success: {
    bg: 'bg-[#0a1f15]',
    border: 'border-emerald-500/30',
    icon: '✅',
    iconBg: 'bg-emerald-500/20',
    progressColor: 'bg-emerald-500',
    titleColor: 'text-emerald-400',
  },
  error: {
    bg: 'bg-[#1f0a0a]',
    border: 'border-rose-500/30',
    icon: '❌',
    iconBg: 'bg-rose-500/20',
    progressColor: 'bg-rose-500',
    titleColor: 'text-rose-400',
  },
  info: {
    bg: 'bg-[#0a0f1f]',
    border: 'border-blue-500/30',
    icon: 'ℹ️',
    iconBg: 'bg-blue-500/20',
    progressColor: 'bg-blue-500',
    titleColor: 'text-blue-400',
  },
  warning: {
    bg: 'bg-[#1f1a0a]',
    border: 'border-amber-500/30',
    icon: '⚠️',
    iconBg: 'bg-amber-500/20',
    progressColor: 'bg-amber-500',
    titleColor: 'text-amber-400',
  },
  'agent-complete': {
    bg: 'bg-[#0f0a1f]',
    border: 'border-indigo-500/30',
    icon: '🤖',
    iconBg: 'bg-indigo-500/20',
    progressColor: 'bg-indigo-500',
    titleColor: 'text-indigo-400',
  },
};

// ── Single Toast Item ─────────────────────────────────────────────────────────
const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 8000;
  const style = TOAST_STYLES[toast.type];

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  // Try browser notification (best-effort)
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(toast.title, { body: toast.message, icon: '/favicon.ico' });
      } catch { /* ignore */ }
    }
  }, [toast.title, toast.message]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative w-[380px] rounded-2xl border ${style.border} ${style.bg} backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center text-lg flex-shrink-0`}>
            {style.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`text-[11px] font-black uppercase tracking-widest ${style.titleColor}`}>
                {toast.agentName ? `${toast.agentName} Agent` : toast.title}
              </h4>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {toast.agentName && (
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{toast.title}</p>
            )}
            <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">{toast.message}</p>

            {/* Actions */}
            {(toast.action || toast.secondaryAction) && (
              <div className="flex gap-2 mt-3">
                {toast.action && (
                  <button
                    onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
                    className="flex-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    {toast.action.label}
                  </button>
                )}
                {toast.secondaryAction && (
                  <button
                    onClick={() => { toast.secondaryAction!.onClick(); onDismiss(toast.id); }}
                    className="flex-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                  >
                    {toast.secondaryAction.label}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-[2px] bg-slate-800/50 w-full">
        <motion.div
          className={`h-full ${style.progressColor}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
    </motion.div>
  );
};

// ── Toast Container ───────────────────────────────────────────────────────────
const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 pointer-events-auto">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastNotification;

// ── Hook Helper ───────────────────────────────────────────────────────────────
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Request browser notification permission on first toast
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
