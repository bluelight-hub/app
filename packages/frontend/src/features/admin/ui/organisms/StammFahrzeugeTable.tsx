import { useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PiPencilSimple, PiArchive, PiCheckCircle, PiProhibit, PiCar } from 'react-icons/pi';
import type { StammFahrzeugDto } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface StammFahrzeugeTableProps {
  stammFahrzeuge: StammFahrzeugDto[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (fahrzeug: StammFahrzeugDto) => void;
  onArchive: (fahrzeug: StammFahrzeugDto) => void;
  updatingId?: string;
  archivingId?: string;
  onCreateOpen?: () => void;
}

const columnHelper = createColumnHelper<StammFahrzeugDto>();

/**
 * StammFahrzeuge Tabelle mit Sortierung und Suche.
 *
 * Zeigt alle Stamm-Fahrzeuge mit Status-Badge und Aktionen.
 */
export const StammFahrzeugeTable = ({ stammFahrzeuge, isLoading, error, onRetry, onEdit, onArchive, updatingId, archivingId, onCreateOpen }: StammFahrzeugeTableProps) => {
  const handleEdit = useCallback(
    (fahrzeug: StammFahrzeugDto) => {
      onEdit(fahrzeug);
    },
    [onEdit],
  );

  const handleArchive = useCallback(
    (fahrzeug: StammFahrzeugDto) => {
      onArchive(fahrzeug);
    },
    [onArchive],
  );

  const columns: ColumnDef<StammFahrzeugDto, any>[] = useMemo(
    () => [
      columnHelper.accessor('rufname', {
        header: 'Rufname',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('funkrufname', {
        header: 'Funkrufname',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('fahrzeugtyp', {
        header: 'Fahrzeugtyp',
        cell: ({ row }) => (
          <Badge variant="info" size="sm">
            {row.original.fahrzeugtyp.code}
          </Badge>
        ),
        sortingFn: (rowA, rowB) => rowA.original.fahrzeugtyp.code.localeCompare(rowB.original.fahrzeugtyp.code),
      }),
      columnHelper.accessor('kennzeichen', {
        header: 'Kennzeichen',
        cell: (info) => <span className="text-text-secondary">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('baujahr', {
        header: 'Baujahr',
        cell: (info) => <span className="text-text-secondary">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('archivedAt', {
        header: 'Status',
        cell: ({ row }) =>
          !row.original.archivedAt ? (
            <Badge variant="success" size="sm">
              <PiCheckCircle className="mr-1" /> Aktiv
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              <PiProhibit className="mr-1" /> Archiviert
            </Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowArchiving = archivingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowArchiving;
          const isArchived = !!row.original.archivedAt;
          return (
            <div className="flex items-center gap-2">
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Fahrzeug bearbeiten" disabled={isRowMutating || isArchived}>
                <PiPencilSimple />
              </IconButton>
              {!isArchived && (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleArchive(row.original)} aria-label="Fahrzeug archivieren" disabled={isRowMutating}>
                  <PiArchive />
                </IconButton>
              )}
            </div>
          );
        },
      }),
    ],
    [handleEdit, handleArchive, updatingId, archivingId],
  );

  return (
    <DataTable
      columns={columns}
      data={stammFahrzeuge}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Fahrzeuge durchsuchen...' }}
      defaultSorting={[{ id: 'rufname', desc: false }]}
      emptyState={{
        icon: PiCar,
        title: 'Noch keine Stamm-Fahrzeuge angelegt',
        description: 'Legen Sie das erste Fahrzeug an.',
        action: onCreateOpen ? { label: 'Fahrzeug hinzufügen', onClick: onCreateOpen } : undefined,
      }}
    />
  );
};
