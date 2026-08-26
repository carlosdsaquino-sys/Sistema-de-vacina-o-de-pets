import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  className?: string;
  dot?: boolean;
  dotColor?: string;
}

export function Badge({ children, className, dot, dotColor }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200',
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />}
      {children}
    </span>
  );
}
