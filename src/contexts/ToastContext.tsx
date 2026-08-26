import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const config: Record<ToastType, { icon: typeof CheckCircle2; bg: string; border: string; iconColor: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600' },
  info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const c = config[t.type];
            const Icon = c.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${c.bg} ${c.border} px-4 py-3 shadow-lg`}
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${c.iconColor}`} />
                <p className="flex-1 text-sm text-gray-700 font-medium">{t.message}</p>
                <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 transition">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
