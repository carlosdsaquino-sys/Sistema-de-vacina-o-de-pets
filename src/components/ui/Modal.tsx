import { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={cn(
              'relative w-full rounded-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[90vh] border border-transparent dark:border-slate-800',
              sizes[size]
            )}
          >
            
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800">
                <div>
                  {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
                  {description && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
