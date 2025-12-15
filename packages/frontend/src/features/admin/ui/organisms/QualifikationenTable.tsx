import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiProhibit, PiCheckCircle, PiCaretUpDown } from 'react-icons/pi';
import { type QualifikationDto, KATEGORIE_LABELS, getKategorieBadgeVariant } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';

interface QualifikationenTableProps {
  qualifikationen: QualifikationDto[];
  isLoading: boolean;
  onEdit: (qualifikation: QualifikationDto) => void;
  onDeactivate: (qualifikation: QualifikationDto) => void;
  updatingId?: string;
  deactivatingId?: string;
}

const columnHelper = createColumnHelper<QualifikationDto>();

/**
 * Qualifikationen Tabelle mit Sortierung.
 *
 * Zeigt alle Qualifikationen mit Status-Badge und Aktionen.
 */
export const QualifikationenTable = ({ qualifikationen, isLoading, onEdit, onDeactivate, updatingId, deactivatingId }: QualifikationenTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  // Stabile Callback-Referenzen mit useCallback - verhindert unnötige Table Re-Renders
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
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Abkürzung sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Abkürzung
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="font-medium font-mono">{info.getValue()}</span>,
      }),
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
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('kategorie', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Kategorie sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Kategorie
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
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
        cell: ({ row }) => {
          // Per-Row Mutation Tracking: Disable nur die Zeile, die gerade mutiert wird
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

  const table = useReactTable({
    data: qualifikationen,
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
  if (qualifikationen.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        <Text className="text-gray-600">Keine Qualifikationen vorhanden.</Text>
        <Text className="text-gray-500 text-sm">Erstellen Sie eine neue Qualifikation.</Text>
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
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id} className={!row.original.istAktiv ? 'opacity-60' : ''}>
            {row.getVisibleCells().map((cell) => (
              <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};
