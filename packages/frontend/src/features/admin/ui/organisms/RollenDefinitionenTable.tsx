import { useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PiPencilSimple, PiProhibit, PiCheckCircle, PiShieldCheck } from 'react-icons/pi';
import type { RollenDefinitionDto } from '@/shared';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface RollenDefinitionenTableProps {
  rollenDefinitionen: RollenDefinitionDto[];
  onEdit: (rolle: RollenDefinitionDto) => void;
  onDeactivate: (rolle: RollenDefinitionDto) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  updatingId?: string;
  deactivatingId?: string;
  onCreateOpen?: () => void;
}

const columnHelper = createColumnHelper<RollenDefinitionDto>();

/**
 * Formatiert ein Datum für die Anzeige.
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Rollendefinitionen Tabelle mit Sortierung und Suche.
 *
 * Zeigt alle Rollendefinitionen mit Status-Badge, Qualifikationen und Aktionen.
 */
export const RollenDefinitionenTable = ({ rollenDefinitionen, isLoading, error, onRetry, onEdit, onDeactivate, updatingId, deactivatingId, onCreateOpen }: RollenDefinitionenTableProps) => {
  const handleEdit = useCallback(
    (rolle: RollenDefinitionDto) => {
      onEdit(rolle);
    },
    [onEdit],
  );

  const handleDeactivate = useCallback(
    (rolle: RollenDefinitionDto) => {
      onDeactivate(rolle);
    },
    [onDeactivate],
  );

  const columns: ColumnDef<RollenDefinitionDto, any>[] = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('funkrufname', {
        header: 'Funkrufname',
        cell: (info) => <span className="text-text-secondary">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('erforderlicheQualifikationen', {
        header: 'Qualifikationen',
        enableSorting: false,
        cell: ({ row }) => {
          const qualifikationen = row.original.erforderlicheQualifikationen;
          if (qualifikationen.length === 0) {
            return <span className="text-text-muted">—</span>;
          }

          const maxVisible = 3;
          const visibleQuals = qualifikationen.slice(0, maxVisible);
          const remaining = qualifikationen.length - maxVisible;

          return (
            <div className="flex flex-wrap gap-1">
              {visibleQuals.map((qual) => (
                <Badge key={qual.qualifikationId} variant={qual.istPflicht ? 'warning' : 'default'} size="sm" title={qual.qualifikationName}>
                  {qual.qualifikationAbkuerzung}
                </Badge>
              ))}
              {remaining > 0 && (
                <Badge variant="default" size="sm">
                  +{remaining}
                </Badge>
              )}
            </div>
          );
        },
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
      columnHelper.accessor('createdAt', {
        header: 'Erstellt am',
        cell: (info) => <span className="whitespace-nowrap text-text-secondary">{formatDate(info.getValue())}</span>,
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
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Rolle bearbeiten" disabled={isRowMutating}>
                <PiPencilSimple />
              </IconButton>
              {row.original.istAktiv && (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleDeactivate(row.original)} aria-label="Rolle deaktivieren" disabled={isRowMutating}>
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
      data={rollenDefinitionen}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Rollen durchsuchen...' }}
      defaultSorting={[{ id: 'name', desc: false }]}
      emptyState={{
        icon: PiShieldCheck,
        title: 'Noch keine Rollen definiert',
        description: 'Legen Sie die erste Rollendefinition an.',
        action: onCreateOpen ? { label: 'Neue Rolle', onClick: onCreateOpen } : undefined,
      }}
    />
  );
};
