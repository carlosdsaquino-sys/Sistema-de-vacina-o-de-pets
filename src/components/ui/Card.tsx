import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function Card({ children, className, hover = false, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800',
       hover &&
  'transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4 border-b border-gray-100 dark:border-slate-800', className)}>{children}</div>;
}

export function CardBody({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={cn('p-5', className)} onClick={onClick}>{children}</div>;
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-base font-semibold text-gray-900 dark:text-white', className)}>{children}</h3>;
}
