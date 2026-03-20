import { EtbEntryDetails } from '@/features/etb/ui/organisms/components/EtbEntryDetails';
import { EtbTableRowEditable } from '@/features/etb/ui/organisms/components/EtbTableRowEditable';
import { useIsEntryHighlighted } from '@/features/reminders/stores';
import { cn } from '@/shared/ui/cn';
import type { EintragDto } from '@/shared';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import type { VirtualItem } from '@tanstack/react-virtual';
import { Fragment, memo, useCallback } from 'react';
import { PiCircleNotch } from 'react-icons/pi';

interface EtbTableBodyProps {
  virtualRows: VirtualItem[];
  rows: Row<EintragDto>[];
  columns: ColumnDef<EintragDto>[];
  paddingTop: number;
  paddingBottom: number;
  isLoading: boolean;
  entries: EintragDto[];
  enableInlineEdit: boolean;
  einsatzId?: string;
  /**
   * ETB-ID fuer Timeline-Abfrage (Story 5.5)
   */
  etbId?: string;
  onDelete: (entry: EintragDto) => void;
  getUserName: (userId: string) => string | undefined;
  /**
   * Callback wenn auf einen ETB-Eintrag in der Timeline geklickt wird (Story 5.5)
   */
  onEntryClick?: (entryId: string) => void;
  /** Aktiver Suchbegriff fuer Leerzustand-Meldung (Story 3.4) */
  globalFilter?: string;
}

// Statische Skeleton-Row-Keys (für Performance und Linter)
const SKELETON_KEYS = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);

/**
 * Story 5.5: Einzelne Tabellenzeile mit Highlight-Support
 *
 * Nutzt useIsEntryHighlighted um reaktiv auf Highlight-Store Aenderungen zu reagieren.
 */
interface EtbTableRowProps {
  row: Row<EintragDto>;
  virtualRowSize: number;
  /** 1-basierter Index fuer aria-rowindex (Story 3.4) */
  ariaRowIndex?: number;
}

const EtbTableRow = memo(function EtbTableRowComponent({ row, virtualRowSize, ariaRowIndex }: EtbTableRowProps) {
  const isHighlighted = useIsEntryHighlighted(row.original.id);

  /** Story 3.4: Enter/Space toggelt Expand/Collapse */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Nur reagieren wenn das Event direkt auf der Zeile ausgeloest wurde, nicht in Child-Buttons
        if (e.target === e.currentTarget) {
          e.preventDefault();
          row.toggleExpanded();
        }
      }
    },
    [row],
  );

  return (
    <tr
      id={`etb-entry-${row.original.id}`}
      tabIndex={0}
      aria-rowindex={ariaRowIndex}
      aria-expanded={row.getIsExpanded()}
      onKeyDown={handleKeyDown}
      className={cn(
        'transition-all duration-300 focus-visible:shadow-focus-ring focus-visible:outline-none',
        row.original.deletedAt ? 'border-l-2 border-l-red-500 bg-red-50/30 opacity-60 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/50',
        // Story 5.5: Highlight-Animation wenn Entry hervorgehoben ist
        isHighlighted && 'bg-primary-50 ring-2 ring-primary-500 ring-offset-2 dark:bg-primary-900/20',
      )}
      style={{ height: `${virtualRowSize}px` }}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-3 align-top"
          style={{
            width: cell.column.getSize(),
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

/**
 * ETB Table Body mit Virtualisierung
 *
 * **Story 5.5:** Unterstuetzt Timeline-Widget in expandierten Eintraegen
 */
export function EtbTableBody({
  virtualRows,
  rows,
  columns,
  paddingTop,
  paddingBottom,
  isLoading,
  entries,
  enableInlineEdit,
  einsatzId,
  etbId,
  onDelete,
  getUserName,
  onEntryClick,
  globalFilter,
}: EtbTableBodyProps) {
  return (
    <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
      {paddingTop > 0 && (
        <tr>
          <td colSpan={columns.length} style={{ height: `${paddingTop}px` }} />
        </tr>
      )}

      {/* Loading Overlay innerhalb der Tabelle */}
      {isLoading && entries.length === 0 ? (
        <>
          <tr>
            <td colSpan={columns.length} className="px-4 pt-4">
              <output className="flex items-center gap-2 text-gray-500 text-sm dark:text-gray-400" aria-live="polite" aria-atomic="true">
                <PiCircleNotch className="h-4 w-4 animate-spin" />
                <span>ETB-Einträge werden geladen…</span>
              </output>
            </td>
          </tr>
          {SKELETON_KEYS.map((key) => (
            <tr key={key} className="animate-pulse">
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
          ))}
        </>
      ) : !isLoading && entries.length === 0 && virtualRows.length === 0 ? (
        /* Defensive Fallback: EtbEntryList fängt entries.length===0 vorher ab, aber als Sicherheitsnetz behalten */
        <tr>
          <td colSpan={columns.length} className="h-[300px]">
            <div className="flex h-full items-center justify-center" role="status">
              <p className="text-gray-500 text-sm dark:text-gray-400">Keine Einträge gefunden</p>
            </div>
          </td>
        </tr>
      ) : rows.length === 0 && entries.length > 0 && globalFilter ? (
        /* Story 3.4 Task 1.3: Keine Treffer fuer Suchbegriff */
        <tr>
          <td colSpan={columns.length} className="h-[300px]">
            <div className="flex h-full items-center justify-center" role="status">
              <p className="text-gray-500 text-sm dark:text-gray-400">Keine Treffer für &laquo;{globalFilter}&raquo;</p>
            </div>
          </td>
        </tr>
      ) : virtualRows.length === 0 && entries.length > 0 ? (
        // Fallback während Virtualizer initialisiert
        <tr>
          <td colSpan={columns.length} className="h-[500px]">
            <output className="flex h-full flex-col items-center justify-center gap-2" aria-live="polite" aria-atomic="true">
              <PiCircleNotch className="h-6 w-6 animate-spin text-primary-500" />
              <span className="text-gray-500 text-sm dark:text-gray-400">Einträge werden aktualisiert…</span>
            </output>
          </td>
        </tr>
      ) : (
        virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <Fragment key={row.id}>
              {/* Main Row */}
              {enableInlineEdit && einsatzId ? (
                <EtbTableRowEditable row={row} style={{ height: `${virtualRow.size}px` }} onDelete={onDelete} einsatzId={einsatzId} etbId={etbId ?? ''} ariaRowIndex={virtualRow.index + 1} />
              ) : (
                <EtbTableRow row={row} virtualRowSize={virtualRow.size} ariaRowIndex={virtualRow.index + 1} />
              )}

              {/* Expanded Row */}
              {row.getIsExpanded() && (
                <tr>
                  <td colSpan={columns.length} className="bg-gray-50 px-8 py-4 dark:bg-gray-900/30" aria-label={`Details zu Eintrag #${row.original.sequenceNumber}`}>
                    <EtbEntryDetails entry={row.original} getUserName={getUserName} etbId={etbId} onEntryClick={onEntryClick} />
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
  );
}
