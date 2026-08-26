import { Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', icon: Icon = Search, className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
       className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500"
       />
    </div>
  );
}
