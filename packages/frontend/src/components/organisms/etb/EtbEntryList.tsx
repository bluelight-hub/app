import { useDeleteEtbEintrag } from '@/hooks/useEtb';
import { useConfirm } from '@/hooks/useConfirm';
import { useUserNames } from '@/hooks/useUsers';
import { cn } from '@/utils/cn';
import type { EtbEintragDto } from '@bluelight-hub/shared/client';
import { type ExpandedState, flexRender, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, type SortingState, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { PiCircleNotch, PiClock, PiMagnifyingGlass, PiTrash } from 'react-icons/pi';
import { EtbEntryDetails } from './components/EtbEntryDetails';
import { EtbTableRowEditable } from './components/EtbTableRowEditable';
import { EtbHistoryModal } from './components/EtbHistoryModal';
import { useEtbColumns } from './hooks/useEtbColumns';

interface EtbEntryListProps {
  entries: EtbEintragDto[];
  einsatzId?: string;
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  onEditEntry?: (entry: EtbEintragDto) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  enableInlineEdit?: boolean;
  showDeleted?: boolean;
  onShowDeletedChange?: (show: boolean) => void;
}

/**
 * ETB-Einträge-Liste mit TanStack Table
 */
export function EtbEntryList({
  entries,
  einsatzId,
  isLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onEditEntry,
  onSortChange,
  sortBy = 'timestamp',
  sortOrder = 'desc',
  enableInlineEdit = false,
  showDeleted = false,
  onShowDeletedChange,
}: EtbEntryListProps) {
  const deleteEintrag = useDeleteEtbEintrag();
  const confirm = useConfirm();
  const { getUserName } = useUserNames();
  const [globalFilter, setGlobalFilter] = useState('');
  const [historyEntry, setHistoryEntry] = useState<EtbEintragDto | null>(null);

  // Sortierung für Anzeige - lokaler State für die Table
  const [sorting, setSorting] = useState<SortingState>(() => [{ id: sortBy, desc: sortOrder === 'desc' }]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const observerTarget = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Synchronisiere lokalen Sortier-State mit Props
  useEffect(() => {
    setSorting([{ id: sortBy, desc: sortOrder === 'desc' }]);
  }, [sortBy, sortOrder]);

  // Intersection Observer für Infinite Scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0].isIntersecting && hasNextPage && !isFetchingNextPage && fetchNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Verhindere Parent-Scrolling während Table-Scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop === 0;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

      // Scrolling nach oben am Anfang oder nach unten am Ende verhindern
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        return; // Erlaube Parent-Scrolling
      }

      // Verhindere Parent-Scrolling während Table-Scroll
      e.preventDefault();
      container.scrollTop += e.deltaY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleDelete = useCallback(
    async (entry: EtbEintragDto) => {
      const confirmed = await confirm({
        title: 'Eintrag löschen',
        message: 'Möchten Sie diesen ETB-Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        variant: 'danger',
        confirmLabel: 'Löschen',
        cancelLabel: 'Abbrechen',
      });

      if (confirmed) {
        deleteEintrag.mutate({
          eintragId: entry.id,
          einsatzId: entry.etbId,
        });
      }
    },
    [confirm, deleteEintrag],
  );

  // Column Definitions - Using extracted hook
  const columns = useEtbColumns({
    onEditEntry,
    handleDelete,
    onShowHistory: setHistoryEntry,
  });

  // Table Instance
  const table = useReactTable({
    data: entries,
    columns,
    state: {
      sorting,
      globalFilter,
      expanded,
    },
    manualSorting: true, // Serverseitige Sortierung
    onSortingChange: (updater) => {
      // Bei Sortierungsänderung Callback aufrufen für neue Serverdaten
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting); // Lokalen State aktualisieren

      if (newSorting.length > 0) {
        const field = newSorting[0].id;
        const order = newSorting[0].desc ? 'desc' : 'asc';
        onSortChange?.(field, order);
      }
    },
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    // getSortedRowModel nicht nutzen bei manueller Sortierung
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  // Virtualizer für Performance-Optimierung
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: useCallback(() => 60, []), // Feste Größe für stabileres Layout
    overscan: 10, // Weniger overscan für bessere Performance
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0) : 0;

  // Empty State mit fester Höhe für konsistentes Layout
  if (entries.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        {/* Search - auch bei leerer Liste anzeigen für konsistentes Layout */}
        <div className="relative">
          <PiMagnifyingGlass className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Einträge durchsuchen..."
            className={cn(
              'w-full py-2 pr-4 pl-9 text-sm',
              'rounded-lg border border-gray-300',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
              'placeholder:text-gray-400',
            )}
          />
        </div>

        {/* Empty State Container mit fester Höhe */}
        <div className="flex h-[600px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-700">
              <PiClock className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 text-lg dark:text-gray-100">Keine Einträge vorhanden</h3>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Fügen Sie den ersten Eintrag zum Einsatztagebuch hinzu.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter-Optionen */}
      <div className="flex items-center gap-4">
        {/* Gelöschte Einträge Toggle */}
        {onShowDeletedChange && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => onShowDeletedChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
            />
            <span className="flex items-center gap-1.5 text-gray-700 text-sm dark:text-gray-300">
              <PiTrash className="h-4 w-4" />
              Gelöschte Einträge anzeigen
            </span>
          </label>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <PiMagnifyingGlass className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
        <input
          type="text"
          value={globalFilter ?? ''}
          onChange={(e) => {
            // Direkte Eingabe ohne Debouncing für bessere UX
            setGlobalFilter(e.target.value);
          }}
          placeholder="Einträge durchsuchen..."
          className={cn(
            'w-full py-2 pr-4 pl-9 text-sm',
            'rounded-lg border border-gray-300',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            'placeholder:text-gray-400',
          )}
        />
      </div>

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="relative isolate overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        style={{
          height: '600px',
          minHeight: '600px',
          maxHeight: '600px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling auf iOS
          scrollbarGutter: 'stable', // Verhindert Layout-Shift durch Scrollbar
        }}
      >
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-gray-200 border-b dark:border-gray-700">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn('px-3 py-3 text-left font-medium text-gray-500 text-xs dark:text-gray-400', header.column.getCanSort() && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800')}
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

          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {paddingTop > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {/* Loading Overlay innerhalb der Tabelle */}
            {isLoading && entries.length === 0 ? (
              // Initial Loading - Skeleton Rows
              Array.from({ length: 10 }, (_, i) => (
                <tr key={`initial-skeleton-${i}`} className="animate-pulse">
                  <td className="px-3 py-2">
                    <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                </tr>
              ))
            ) : virtualRows.length === 0 && entries.length > 0 ? (
              // Fallback während Virtualizer initialisiert
              <tr>
                <td colSpan={columns.length} className="h-[500px]">
                  <div className="flex h-full items-center justify-center">
                    <PiCircleNotch className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                </td>
              </tr>
            ) : (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <Fragment key={row.id}>
                    {/* Main Row */}
                    {enableInlineEdit && einsatzId ? (
                      <EtbTableRowEditable row={row} style={{ height: `${virtualRow.size}px` }} onDelete={handleDelete} />
                    ) : (
                      <tr
                        className={cn(
                          'transition-colors',
                          row.original.deletedAt ? 'border-l-2 border-l-red-500 bg-red-50/30 opacity-60 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/50',
                        )}
                        style={{ height: `${virtualRow.size}px` }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-2"
                            style={{
                              width: cell.column.getSize(),
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    )}

                    {/* Expanded Row */}
                    {row.getIsExpanded() && (
                      <tr>
                        <td colSpan={columns.length} className="bg-gray-50 px-8 py-4 dark:bg-gray-900/30">
                          <EtbEntryDetails entry={row.original} getUserName={getUserName} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={columns.length} style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </table>

        {/* Loading Indicator for Next Page */}
        {isFetchingNextPage && (
          <div className="flex justify-center bg-white py-4 dark:bg-gray-950">
            <PiCircleNotch className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        )}

        {/* Observer Target for Infinite Scrolling */}
        <div ref={observerTarget} className="h-1" />
      </div>

      {/* Results Count */}
      <div className="text-gray-500 text-sm dark:text-gray-400">
        {globalFilter && table.getFilteredRowModel().rows.length !== entries.length ? `${table.getFilteredRowModel().rows.length} von ${entries.length} Einträgen` : `${entries.length} Einträge`}
        {hasNextPage && ' (weitere werden beim Scrollen geladen)'}
      </div>

      {/* History Modal */}
      <EtbHistoryModal entry={historyEntry} isOpen={historyEntry !== null} onClose={() => setHistoryEntry(null)} />
    </div>
  );
}
