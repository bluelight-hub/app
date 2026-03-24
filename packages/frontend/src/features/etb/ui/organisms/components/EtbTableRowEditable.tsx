import type React from 'react';
import { useCallback, useState } from 'react';
import { flexRender, type Row } from '@tanstack/react-table';
import type { EintragDto } from '@/shared';
import { useUpdateEtbEntry } from '@/features/etb';
import { cn } from '@/shared/ui/cn';
import { EtbActionsCell } from './cells/EtbActionsCell';
import { openQuickCreateFromEtb, useIsEntryHighlighted } from '@/features/reminders/stores';

interface EtbTableRowEditableProps {
  row: Row<EintragDto>;
  style?: React.CSSProperties;
  className?: string;
  onDelete?: (entry: EintragDto) => void;
  /** Einsatz-ID fuer Erinnerung-Erstellung (Story 5.4) */
  einsatzId: string;
  /** ETB-ID fuer Eintrag-Update */
  etbId: string;
  /** 1-basierter Index fuer aria-rowindex (Accessibility) */
  ariaRowIndex?: number;
}

export const EtbTableRowEditable: React.FC<EtbTableRowEditableProps> = ({ row, style, className = '', onDelete, einsatzId, etbId, ariaRowIndex }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(row.original.text);
  const updateEintrag = useUpdateEtbEntry();
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

  const handleSave = () => {
    if (!row.original.id) return;

    updateEintrag.mutate(
      {
        etbId,
        eintragId: row.original.id,
        data: {
          newText: editText,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setEditText(row.original.text);
    setIsEditing(false);
  };

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
        row.original.deletedAt ? 'border-l-2 border-l-status-danger-border bg-status-danger-surface/30 opacity-60' : 'hover:bg-surface-raised',
        isEditing && 'bg-action-secondary',
        // Story 5.5: Highlight-Animation wenn Entry hervorgehoben ist
        isHighlighted && 'bg-status-info-surface ring-2 ring-status-info-border ring-offset-2 ring-offset-surface-panel',
        className,
      )}
      style={style}
    >
      {row.getVisibleCells().map((cell) => {
        const columnId = cell.column.id;

        // Special handling for text column in edit mode
        if (columnId === 'text' && isEditing) {
          return (
            <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={cn(
                  'w-full rounded-md border border-border-subtle bg-surface-panel px-3 py-2 text-sm text-text-primary shadow-sm',
                  'focus:border-action-primary focus-visible:shadow-focus-ring focus-visible:outline-none',
                  'resize-none',
                )}
                rows={2}
              />
            </td>
          );
        }

        // Special handling for actions column
        if (columnId === 'actions') {
          return (
            <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
              <EtbActionsCell
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={onDelete ? () => onDelete(row.original) : undefined}
                onCreateErinnerung={handleCreateErinnerung}
                isLoading={updateEintrag.isPending}
                isDeleted={!!row.original.deletedAt}
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
