import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'gray';
  delay?: number;
}

const colors = {
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' },
  gray: { bg: 'bg-gray-100', icon: 'text-gray-600', ring: 'ring-gray-200' },
};

export function StatCard({ label, value, icon: Icon, trend, color = 'emerald', delay = 0 }: StatCardProps) {
  const c = colors[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend.positive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={trend.positive ? 'text-emerald-600' : 'text-red-600'}>
                {trend.positive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-gray-400">vs. período anterior</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl ring-4', c.bg, c.icon, c.ring)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
