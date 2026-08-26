import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] animate-shimmer',
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm space-y-3">
      <LoadingSkeleton className="h-4 w-1/3" />
      <LoadingSkeleton className="h-8 w-2/3" />
      <LoadingSkeleton className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm flex items-center gap-4"
        >
          <LoadingSkeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton className="h-4 w-1/4" />
            <LoadingSkeleton className="h-3 w-1/2" />
          </div>
          <LoadingSkeleton className="h-6 w-20 rounded-full" />
        </motion.div>
      ))}
    </div>
  );
}
