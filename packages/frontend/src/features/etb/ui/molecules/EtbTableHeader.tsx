import { cn } from '@/shared/ui/cn';
import type { HeaderGroup } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';

interface EtbTableHeaderProps<T> {
  headerGroups: HeaderGroup<T>[];
}

/**
 * ETB Table Header mit Sortierung
 */
export function EtbTableHeader<T>({ headerGroups }: EtbTableHeaderProps<T>) {
  return (
    <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} className="border-gray-200 border-b dark:border-gray-700">
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className={cn(
                'px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400',
                header.column.getCanSort() && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
              style={{
                width: header.getSize(),
              }}
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className="flex items-center gap-1">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {/* Sortier-Indikator */}
                {header.column.getIsSorted() && <span className="text-primary-500">{header.column.getIsSorted() === 'desc' ? '↓' : '↑'}</span>}
              </div>
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}
