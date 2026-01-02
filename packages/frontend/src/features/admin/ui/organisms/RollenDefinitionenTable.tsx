import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiProhibit, PiCheckCircle, PiCaretUpDown } from 'react-icons/pi';
import type { RollenDefinitionDto } from '@bluelight-hub/shared/client';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';

interface RollenDefinitionenTableProps {
  rollenDefinitionen: RollenDefinitionDto[];
  onEdit: (rolle: RollenDefinitionDto) => void;
  onDeactivate: (rolle: RollenDefinitionDto) => void;
  isLoading?: boolean;
  updatingId?: string;
  deactivatingId?: string;
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
 * Rollendefinitionen Tabelle mit Sortierung.
 *
 * Zeigt alle Rollendefinitionen mit Status-Badge, Qualifikationen und Aktionen.
 */
export const RollenDefinitionenTable = ({ rollenDefinitionen, isLoading, onEdit, onDeactivate, updatingId, deactivatingId }: RollenDefinitionenTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  // Stabile Callback-Referenzen mit useCallback - verhindert unnötige Table Re-Renders
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

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Name sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Name
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('funkrufname', {
        header: 'Funkrufname',
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('erforderlicheQualifikationen', {
        header: 'Qualifikationen',
        cell: ({ row }) => {
          const qualifikationen = row.original.erforderlicheQualifikationen;
          if (qualifikationen.length === 0) {
            return <span className="text-gray-500 dark:text-gray-400">—</span>;
          }

          // Zeige maximal 3 Badges, danach "+X weitere"
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
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Erstellt am sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Erstellt am
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="whitespace-nowrap text-gray-600 dark:text-gray-400">{formatDate(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          // Per-Row Mutation Tracking: Disable nur die Zeile, die gerade mutiert wird
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

  const table = useReactTable({
    data: rollenDefinitionen,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty State
  if (rollenDefinitionen.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        <Text className="text-gray-600">Keine Rollendefinitionen vorhanden.</Text>
        <Text className="text-gray-500 text-sm">Erstellen Sie eine neue Rollendefinition.</Text>
      </div>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              const ariaSort = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none';

              return (
                <Table.Head key={header.id} className="whitespace-nowrap" scope="col" aria-sort={header.column.getCanSort() ? ariaSort : undefined}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              );
            })}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => {
          // Visual Feedback für Optimistic Updates
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeactivating = deactivatingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeactivating;

          // Kombiniere Opacity-Klassen: deaktivierte Zeilen + mutating rows
          const rowClassName = [!row.original.istAktiv && 'opacity-60', isRowMutating && 'opacity-50 transition-opacity duration-200'].filter(Boolean).join(' ');

          return (
            <Table.Row key={row.id} className={rowClassName}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
              ))}
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
};
