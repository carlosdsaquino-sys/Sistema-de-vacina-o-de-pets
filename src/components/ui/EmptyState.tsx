import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
