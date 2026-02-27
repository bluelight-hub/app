import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiTrash, PiCaretUpDown } from 'react-icons/pi';
import type { BefehlsgeberVorschlagDto } from '@/features/admin/api';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';

interface BefehlsgeberVorschlaegeTableProps {
  befehlsgeberVorschlaege: BefehlsgeberVorschlagDto[];
  isLoading: boolean;
  onEdit: (vorschlag: BefehlsgeberVorschlagDto) => void;
  onDelete: (vorschlag: BefehlsgeberVorschlagDto) => void;
  updatingId?: string;
  deletingId?: string;
}

const columnHelper = createColumnHelper<BefehlsgeberVorschlagDto>();

/**
 * Befehlsgeber-Vorschlaege Tabelle mit Sortierung.
 *
 * Zeigt alle Befehlsgeber-Vorschlaege mit Status-Badge und Aktionen.
 */
export const BefehlsgeberVorschlaegeTable = ({ befehlsgeberVorschlaege, isLoading, onEdit, onDelete, updatingId, deletingId }: BefehlsgeberVorschlaegeTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'sortOrder', desc: false }]);

  // Stabile Callback-Referenzen mit useCallback - verhindert unnoetige Table Re-Renders
  const handleEdit = useCallback(
    (vorschlag: BefehlsgeberVorschlagDto) => {
      onEdit(vorschlag);
    },
    [onEdit],
  );

  const handleDelete = useCallback(
    (vorschlag: BefehlsgeberVorschlagDto) => {
      onDelete(vorschlag);
    },
    [onDelete],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('kuerzel', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Kürzel sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Kürzel
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="font-medium font-mono">{info.getValue()}</span>,
      }),
      columnHelper.accessor('label', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Label sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Label
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('sortOrder', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Sortierung sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Sortierung
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          // Per-Row Mutation Tracking: Disable nur die Zeile, die gerade mutiert wird
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeleting = deletingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeleting;

          return (
            <div className="flex items-center gap-2">
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Befehlsgeber-Vorschlag bearbeiten" disabled={isRowMutating}>
                <PiPencilSimple />
              </IconButton>
              <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleDelete(row.original)} aria-label="Befehlsgeber-Vorschlag löschen" disabled={isRowMutating}>
                <PiTrash />
              </IconButton>
            </div>
          );
        },
      }),
    ],
    [handleEdit, handleDelete, updatingId, deletingId],
  );

  const table = useReactTable({
    data: befehlsgeberVorschlaege,
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
  if (befehlsgeberVorschlaege.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        <Text className="text-gray-600">Keine Befehlsgeber-Vorschläge vorhanden.</Text>
        <Text className="text-gray-500 text-sm">Erstellen Sie einen neuen Befehlsgeber-Vorschlag.</Text>
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
          // Visual Feedback fuer Optimistic Updates
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeleting = deletingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeleting;

          const rowClassName = isRowMutating ? 'opacity-50 transition-opacity duration-200' : '';

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
