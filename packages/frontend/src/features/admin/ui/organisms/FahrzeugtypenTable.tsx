import { useCallback, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { PiCheckCircle, PiPencilSimple, PiProhibit, PiTruck } from 'react-icons/pi';
import { type FahrzeugtypDto, FAHRZEUGTYP_KATEGORIE_LABELS, getFahrzeugtypKategorieBadgeVariant } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';

interface FahrzeugtypenTableProps {
  fahrzeugtypen: FahrzeugtypDto[];
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit: (fahrzeugtyp: FahrzeugtypDto) => void;
  onDeactivate: (fahrzeugtyp: FahrzeugtypDto) => void;
  updatingId?: string;
  deactivatingId?: string;
  onCreateOpen?: () => void;
}

interface SollbesatzungData {
  fahrer?: number;
  sanitaeter?: number;
  notarzt?: number;
  funktrupp?: number;
  helfer?: number;
}

const columnHelper = createColumnHelper<FahrzeugtypDto>();

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
};

const extractSollbesatzung = (value: FahrzeugtypDto['sollbesatzung']): SollbesatzungData => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  return { fahrer: toNumber(record.fahrer), sanitaeter: toNumber(record.sanitaeter), notarzt: toNumber(record.notarzt), funktrupp: toNumber(record.funktrupp), helfer: toNumber(record.helfer) };
};

const formatSollbesatzungCompact = (value: FahrzeugtypDto['sollbesatzung']): string => {
  const soll = extractSollbesatzung(value);
  const entries: string[] = [];
  if (soll.fahrer !== undefined) entries.push(`F:${soll.fahrer}`);
  if (soll.sanitaeter !== undefined) entries.push(`S:${soll.sanitaeter}`);
  if (soll.notarzt !== undefined) entries.push(`NA:${soll.notarzt}`);
  if (soll.funktrupp !== undefined) entries.push(`FT:${soll.funktrupp}`);
  if (soll.helfer !== undefined) entries.push(`H:${soll.helfer}`);
  return entries.length > 0 ? entries.join(' · ') : '—';
};

/**
 * Fahrzeugtypen Tabelle mit Sortierung und Suche.
 */
export const FahrzeugtypenTable = ({ fahrzeugtypen, isLoading, error, onRetry, onEdit, onDeactivate, updatingId, deactivatingId, onCreateOpen }: FahrzeugtypenTableProps) => {
  const handleEdit = useCallback(
    (fahrzeugtyp: FahrzeugtypDto) => {
      onEdit(fahrzeugtyp);
    },
    [onEdit],
  );

  const handleDeactivate = useCallback(
    (fahrzeugtyp: FahrzeugtypDto) => {
      onDeactivate(fahrzeugtyp);
    },
    [onDeactivate],
  );

  const columns: ColumnDef<FahrzeugtypDto, any>[] = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: 'Code',
        cell: (info) => <span className="font-mono font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('bezeichnung', {
        header: 'Bezeichnung',
      }),
      columnHelper.accessor('kategorie', {
        header: 'Kategorie',
        cell: ({ row }) => <Badge variant={getFahrzeugtypKategorieBadgeVariant(row.original.kategorie)}>{FAHRZEUGTYP_KATEGORIE_LABELS[row.original.kategorie]}</Badge>,
      }),
      columnHelper.accessor('sollbesatzung', {
        header: 'Sollbesatzung',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm whitespace-nowrap text-text-secondary">{formatSollbesatzungCompact(row.original.sollbesatzung)}</span>,
      }),
      columnHelper.accessor('istAktiv', {
        header: 'Status',
        cell: ({ row }) =>
          row.original.istAktiv ? (
            <Badge variant="success" size="sm">
              <PiCheckCircle className="mr-1" /> Aktiv
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              <PiProhibit className="mr-1" /> Deaktiviert
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
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Fahrzeugtyp bearbeiten" disabled={isRowMutating}>
                <PiPencilSimple />
              </IconButton>
              {row.original.istAktiv && (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleDeactivate(row.original)} aria-label="Fahrzeugtyp deaktivieren" disabled={isRowMutating}>
                  <PiProhibit />
                </IconButton>
              )}
            </div>
          );
        },
      }),
    ],
    [handleDeactivate, handleEdit, updatingId, deactivatingId],
  );

  return (
    <DataTable
      columns={columns}
      data={fahrzeugtypen}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Fahrzeugtypen durchsuchen...' }}
      defaultSorting={[{ id: 'code', desc: false }]}
      emptyState={{
        icon: PiTruck,
        title: 'Noch keine Fahrzeugtypen angelegt',
        description: 'Legen Sie den ersten Fahrzeugtyp an.',
        action: onCreateOpen ? { label: 'Fahrzeugtyp hinzufügen', onClick: onCreateOpen } : undefined,
      }}
    />
  );
};
