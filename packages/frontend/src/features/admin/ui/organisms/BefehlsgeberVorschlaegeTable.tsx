import { useMemo } from 'react';
import { PiPencilSimple, PiTrash, PiMegaphone } from 'react-icons/pi';
import type { ColumnDef } from '@tanstack/react-table';
import type { BefehlsgeberVorschlagDto } from '@/features/admin/api';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface BefehlsgeberVorschlaegeTableProps {
  befehlsgeberVorschlaege: BefehlsgeberVorschlagDto[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (vorschlag: BefehlsgeberVorschlagDto) => void;
  onDelete: (vorschlag: BefehlsgeberVorschlagDto) => void;
  updatingId?: string;
  deletingId?: string;
  onCreateOpen?: () => void;
}

/**
 * Befehlsgeber-Vorschlaege Tabelle mit Sortierung und Suche.
 *
 * Zeigt alle Befehlsgeber-Vorschlaege mit Edit- und Delete-Aktionen.
 */
export const BefehlsgeberVorschlaegeTable = ({ befehlsgeberVorschlaege, isLoading, error, onRetry, onEdit, onDelete, updatingId, deletingId, onCreateOpen }: BefehlsgeberVorschlaegeTableProps) => {
  const columns: ColumnDef<BefehlsgeberVorschlagDto, any>[] = useMemo(
    () => [
      {
        accessorKey: 'kuerzel',
        header: 'Kürzel',
        cell: (info) => <span className="font-mono font-medium">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'label',
        header: 'Label',
      },
      {
        accessorKey: 'sortOrder',
        header: 'Sortierung',
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">{info.getValue() as number}</span>,
      },
      {
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeleting = deletingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeleting;

          return (
            <div className="flex items-center gap-2">
              <IconButton size="sm" appearance="minimal" onClick={() => onEdit(row.original)} aria-label="Befehlsgeber-Vorschlag bearbeiten" disabled={isRowMutating}>
                <PiPencilSimple />
              </IconButton>
              <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => onDelete(row.original)} aria-label="Befehlsgeber-Vorschlag löschen" disabled={isRowMutating}>
                <PiTrash />
              </IconButton>
            </div>
          );
        },
      },
    ],
    [onEdit, onDelete, updatingId, deletingId],
  );

  return (
    <DataTable
      columns={columns}
      data={befehlsgeberVorschlaege}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Vorschläge durchsuchen...' }}
      defaultSorting={[{ id: 'sortOrder', desc: false }]}
      emptyState={{
        icon: PiMegaphone,
        title: 'Noch keine Befehlsgeber-Vorschläge',
        description: 'Legen Sie den ersten Befehlsgeber-Vorschlag an.',
        action: onCreateOpen ? { label: 'Vorschlag hinzufügen', onClick: onCreateOpen } : undefined,
      }}
    />
  );
};
