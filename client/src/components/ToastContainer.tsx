import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore, Toast } from '../store/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t: Toast) => {
        let borderColor = 'border-denzo-pink/40 shadow-denzo-glow-sm';
        let icon = <Info size={18} className="text-denzo-pink flex-shrink-0" />;

        if (t.type === 'success') {
          borderColor = 'border-emerald-500/40 shadow-emerald-500/10 shadow-lg';
          icon = <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />;
        } else if (t.type === 'error') {
          borderColor = 'border-red-500/50 shadow-red-500/10 shadow-lg';
          icon = <AlertCircle size={18} className="text-red-400 flex-shrink-0" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/90 backdrop-blur-xl border ${borderColor} text-white shadow-2xl transition-all animate-in fade-in slide-in-from-top-3 duration-200 hover:scale-[1.02]`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {icon}
              <span className="text-xs font-medium text-zinc-100 truncate">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
