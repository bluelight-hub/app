import type React from 'react';
import { useCallback } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import type { EintragDto } from '@/shared';
import { cn } from '@/shared/ui/cn';
import { EtbActionsCell } from './cells/EtbActionsCell';
import { openQuickCreateFromEtb, useIsEntryHighlighted } from '@/features/reminders/stores';

interface EtbTableRowEditableProps {
  row: Row<EintragDto>;
  style?: React.CSSProperties;
  className?: string;
  onEdit?: (entry: EintragDto) => void;
  onDelete?: (entry: EintragDto) => void;
  /** Einsatz-ID fuer Erinnerung-Erstellung (Story 5.4) */
  einsatzId: string;
  /** ETB-ID fuer Eintrag-Update */
  etbId: string;
  /** 1-basierter Index fuer aria-rowindex (Accessibility) */
  ariaRowIndex?: number;
}

export const EtbTableRowEditable: React.FC<EtbTableRowEditableProps> = ({ row, style, className = '', onEdit, onDelete, einsatzId, etbId: _etbId, ariaRowIndex }) => {
  // Story 5.5: Highlight-Support fuer Inline-Editing Zeilen
  const isHighlighted = useIsEntryHighlighted(row.original.id);

  /** Enter/Space toggelt Expand/Collapse (Accessibility, analog zu EtbTableRow) */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // Nur reagieren wenn das Event direkt auf der Zeile ausgeloest wurde, nicht in Child-Buttons/Inputs
        if (e.target === e.currentTarget) {
          e.preventDefault();
          row.toggleExpanded();
        }
      }
    },
    [row],
  );

  /**
   * Oeffnet den Quick-Create Dialog mit dem ETB-Eintrag verknuepft.
   *
   * **Story 5.4:** "Erinnerung aus ETB-Eintrag erstellen"
   */
  const handleCreateErinnerung = () => {
    if (!row.original.id) return;
    openQuickCreateFromEtb(einsatzId, row.original.id, row.original.text);
  };

  return (
    <tr
      id={`etb-entry-${row.original.id}`}
      tabIndex={0}
      aria-rowindex={ariaRowIndex}
      aria-expanded={row.getIsExpanded()}
      onKeyDown={handleKeyDown}
      className={cn(
        'transition-all duration-300 focus-visible:shadow-focus-ring focus-visible:outline-none',
        row.original.deletedAt
          ? 'border-l-2 border-l-status-danger-border bg-status-danger-surface/30 opacity-60'
          : row.original.isKorrigiert
            ? 'bg-surface-sunken/50 border-l-2 border-l-border-subtle opacity-50'
            : 'hover:bg-surface-raised',
        // Story 5.5: Highlight-Animation wenn Entry hervorgehoben ist
        isHighlighted && 'bg-status-info-surface ring-2 ring-status-info-border ring-offset-2 ring-offset-surface-panel',
        className,
      )}
      style={style}
    >
      {row.getVisibleCells().map((cell) => {
        const columnId = cell.column.id;

        // Special handling for actions column
        if (columnId === 'actions') {
          const isInactive = !!row.original.deletedAt || !!row.original.isKorrigiert;
          return (
            <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
              <EtbActionsCell
                onEdit={!isInactive && onEdit ? () => onEdit(row.original) : undefined}
                onDelete={!isInactive && onDelete ? () => onDelete(row.original) : undefined}
                onCreateErinnerung={!isInactive ? handleCreateErinnerung : undefined}
                isDeleted={isInactive}
              />
            </td>
          );
        }

        // Default rendering for other columns
        return (
          <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
};
