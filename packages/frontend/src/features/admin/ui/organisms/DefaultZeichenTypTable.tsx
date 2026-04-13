/**
 * DefaultZeichenTypTable — Tabelle für Default-Zeichen-Zuordnungen.
 *
 * Zeigt pro Typ (Fahrzeugtyp oder Einheitentyp) das aktuell zugewiesene Zeichen
 * und bietet eine Bearbeiten-Aktion.
 */

import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PiPencilSimple, PiShapes } from 'react-icons/pi';
import { ZeichenPreview } from '@/features/taktische-zeichen/rendering/ZeichenPreview';
import type { ZeichenDefinition } from '@/features/taktische-zeichen/rendering/renderer';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

export interface DefaultZeichenTableEntry {
  /** ID für Identifikation (fahrzeugtypId oder einheitentyp-Enum) */
  id: string;
  /** Anzeige-Name (Code oder Enum-Wert) */
  bezeichnung: string;
  /** Aktuelle Zeichen-Definition (undefined wenn kein Default gesetzt) */
  zeichenDefinition?: ZeichenDefinition;
}

interface DefaultZeichenTypTableProps {
  eintraege: DefaultZeichenTableEntry[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (eintrag: DefaultZeichenTableEntry) => void;
  editingId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const columnHelper = createColumnHelper<DefaultZeichenTableEntry>();

/**
 * Tabelle für Default-Zeichen-Zuordnungen mit Vorschau und Bearbeiten-Aktion.
 */
export function DefaultZeichenTypTable({ eintraege, isLoading, error, onRetry, onEdit, editingId, emptyTitle, emptyDescription }: DefaultZeichenTypTableProps) {
  const columns: ColumnDef<DefaultZeichenTableEntry, any>[] = useMemo(
    () => [
      columnHelper.accessor('bezeichnung', {
        header: 'Typ',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'zeichen',
        header: 'Standard-Zeichen',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.zeichenDefinition ? <ZeichenPreview definition={row.original.zeichenDefinition} size="sm" /> : <span className="text-sm text-text-muted">— nicht gesetzt —</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => {
          const isRowEditing = editingId === row.original.id;
          return (
            <IconButton size="sm" appearance="minimal" onClick={() => onEdit(row.original)} aria-label="Default-Zeichen bearbeiten" disabled={isRowEditing}>
              <PiPencilSimple />
            </IconButton>
          );
        },
      }),
    ],
    [onEdit, editingId],
  );

  return (
    <DataTable
      columns={columns}
      data={eintraege}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      defaultSorting={[{ id: 'bezeichnung', desc: false }]}
      emptyState={{
        icon: PiShapes,
        title: emptyTitle ?? 'Keine Einträge',
        description: emptyDescription ?? 'Es wurden noch keine Typen angelegt.',
      }}
    />
  );
}
