import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id: string }>({ columns, data, empty, onRowClick }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        {empty || <p className="text-sm">Nenhum registro encontrado</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border-b border-gray-50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-gray-50/80',
                i % 2 === 1 && 'bg-gray-50/30'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3.5 text-sm text-gray-700', col.className)}>
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
