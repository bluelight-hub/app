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
    <thead className="sticky top-0 z-10 bg-surface-panel">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} className="border-border-subtle border-b">
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              className={cn('px-4 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wider', header.column.getCanSort() && 'cursor-pointer hover:bg-action-secondary')}
              style={{
                width: header.getSize(),
              }}
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className="flex items-center gap-1">
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {/* Sortier-Indikator */}
                {header.column.getIsSorted() && <span className="text-action-primary">{header.column.getIsSorted() === 'desc' ? '↓' : '↑'}</span>}
              </div>
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}
