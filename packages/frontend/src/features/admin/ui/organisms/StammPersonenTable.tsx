import { useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PiPencilSimple, PiArchive, PiArrowCounterClockwise, PiArrowSquareOut, PiCheckCircle, PiProhibit, PiUsers } from 'react-icons/pi';
import { Link } from '@tanstack/react-router';
import type { StammPersonDto } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface StammPersonenTableProps {
  stammPersonen: StammPersonDto[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (person: StammPersonDto) => void;
  onArchive: (person: StammPersonDto) => void;
  onRestore: (person: StammPersonDto) => void;
  updatingId?: string;
  archivingId?: string;
  restoringId?: string;
  onCreateOpen?: () => void;
}

const columnHelper = createColumnHelper<StammPersonDto>();

/**
 * StammPersonen Tabelle mit Sortierung und Suche.
 *
 * Zeigt alle Stamm-Personen mit Status-Badge und Aktionen.
 */
export const StammPersonenTable = ({ stammPersonen, isLoading, error, onRetry, onEdit, onArchive, onRestore, updatingId, archivingId, restoringId, onCreateOpen }: StammPersonenTableProps) => {
  const handleEdit = useCallback(
    (person: StammPersonDto) => {
      onEdit(person);
    },
    [onEdit],
  );

  const handleArchive = useCallback(
    (person: StammPersonDto) => {
      onArchive(person);
    },
    [onArchive],
  );

  const handleRestore = useCallback(
    (person: StammPersonDto) => {
      onRestore(person);
    },
    [onRestore],
  );

  const columns: ColumnDef<StammPersonDto, any>[] = useMemo(
    () => [
      columnHelper.accessor('personalnummer', {
        header: 'Personalnr.',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('nachname', {
        header: 'Nachname',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('vorname', {
        header: 'Vorname',
      }),
      columnHelper.display({
        id: 'userAccount',
        header: 'Benutzer-Account',
        enableSorting: false,
        cell: ({ row }) => {
          const userAccount = row.original.userAccount;
          if (!userAccount) {
            return <span className="text-text-muted">—</span>;
          }
          return (
            <Link to="/admin/users" className="flex items-center gap-1 text-sm text-action-primary hover:underline">
              {userAccount.username}
              <PiArrowSquareOut className="h-3 w-3" />
            </Link>
          );
        },
      }),
      columnHelper.accessor('qualifikationen', {
        header: 'Qualifikationen',
        enableSorting: false,
        cell: ({ row }) => {
          const quals = row.original.qualifikationen;
          if (!quals || quals.length === 0) {
            return <span className="text-text-muted">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {quals.slice(0, 3).map((q) => (
                <Badge key={q.id} variant="default" size="sm">
                  {q.kuerzel}
                </Badge>
              ))}
              {quals.length > 3 && (
                <Badge variant="default" size="sm">
                  +{quals.length - 3}
                </Badge>
              )}
            </div>
          );
        },
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
          const isRowRestoring = restoringId === row.original.id;
          const isRowMutating = isRowUpdating || isRowArchiving || isRowRestoring;
          const isArchived = !!row.original.archivedAt;
          return (
            <div className="flex items-center gap-2">
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Person bearbeiten" disabled={isRowMutating || isArchived}>
                <PiPencilSimple />
              </IconButton>
              {!isArchived ? (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleArchive(row.original)} aria-label="Person archivieren" disabled={isRowMutating}>
                  <PiArchive />
                </IconButton>
              ) : (
                <IconButton size="sm" intent="primary" appearance="minimal" onClick={() => handleRestore(row.original)} aria-label="Person wiederherstellen" disabled={isRowMutating}>
                  <PiArrowCounterClockwise />
                </IconButton>
              )}
            </div>
          );
        },
      }),
    ],
    [handleEdit, handleArchive, handleRestore, updatingId, archivingId, restoringId],
  );

  return (
    <DataTable
      columns={columns}
      data={stammPersonen}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Personen durchsuchen...' }}
      defaultSorting={[{ id: 'nachname', desc: false }]}
      emptyState={{
        icon: PiUsers,
        title: 'Noch keine Stamm-Personen angelegt',
        description: 'Legen Sie die erste Person an.',
        action: onCreateOpen ? { label: 'Person hinzufügen', onClick: onCreateOpen } : undefined,
      }}
    />
  );
};
