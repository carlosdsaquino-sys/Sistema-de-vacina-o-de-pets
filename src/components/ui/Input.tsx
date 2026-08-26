import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const baseField =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-500dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500';
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" dark:text-slate-500>{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={cn(baseField, icon && 'pl-10', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20', className)}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-gray-500 dark:text-slate-400">{hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(baseField, 'appearance-none bg-no-repeat bg-[right_0.75rem_center] pr-10', error && 'border-red-400', className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
          }}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(baseField, 'resize-none', error && 'border-red-400', className)}
          rows={3}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
