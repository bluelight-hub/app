import { useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiProhibit, PiCheckCircle, PiCertificate } from 'react-icons/pi';
import { type QualifikationDto, KATEGORIE_LABELS, getKategorieBadgeVariant } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface QualifikationenTableProps {
  qualifikationen: QualifikationDto[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (qualifikation: QualifikationDto) => void;
  onDeactivate: (qualifikation: QualifikationDto) => void;
  updatingId?: string;
  deactivatingId?: string;
}

const columnHelper = createColumnHelper<QualifikationDto>();

/**
 * Qualifikationen Tabelle mit DataTable.
 *
 * Zeigt alle Qualifikationen mit Status-Badge und Aktionen.
 */
export const QualifikationenTable = ({ qualifikationen, isLoading, error, onRetry, onEdit, onDeactivate, updatingId, deactivatingId }: QualifikationenTableProps) => {
  const handleEdit = useCallback(
    (qualifikation: QualifikationDto) => {
      onEdit(qualifikation);
    },
    [onEdit],
  );

  const handleDeactivate = useCallback(
    (qualifikation: QualifikationDto) => {
      onDeactivate(qualifikation);
    },
    [onDeactivate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('abkuerzung', {
        header: 'Abkürzung',
        cell: (info) => <span className="font-mono font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('kategorie', {
        header: 'Kategorie',
        cell: ({ row }) => <Badge variant={getKategorieBadgeVariant(row.original.kategorie)}>{KATEGORIE_LABELS[row.original.kategorie]}</Badge>,
      }),
      columnHelper.accessor('beschreibung', {
        header: 'Beschreibung',
        cell: (info) => <span className="line-clamp-1 max-w-xs text-gray-600 dark:text-gray-400">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('istAktiv', {
        header: 'Status',
        cell: ({ row }) =>
          row.original.istAktiv ? (
            <Badge variant="success" size="sm">
              <PiCheckCircle className="mr-1" />
              Aktiv
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              <PiProhibit className="mr-1" />
              Deaktiviert
            </Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeactivating = deactivatingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeactivating;

          return (
            <div className="flex items-center gap-2">
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Qualifikation bearbeiten" disabled={isRowMutating}>
                <PiPencilSimple />
              </IconButton>
              {row.original.istAktiv && (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleDeactivate(row.original)} aria-label="Qualifikation deaktivieren" disabled={isRowMutating}>
                  <PiProhibit />
                </IconButton>
              )}
            </div>
          );
        },
      }),
    ],
    [handleEdit, handleDeactivate, updatingId, deactivatingId],
  );

  return (
    <DataTable
      columns={columns}
      data={qualifikationen}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Qualifikationen durchsuchen...' }}
      defaultSorting={[{ id: 'name', desc: false }]}
      emptyState={{
        icon: PiCertificate,
        title: 'Noch keine Qualifikationen angelegt',
        description: 'Erstellen Sie eine neue Qualifikation.',
      }}
    />
  );
};
