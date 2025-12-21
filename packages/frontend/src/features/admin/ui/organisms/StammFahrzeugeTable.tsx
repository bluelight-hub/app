import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiArchive, PiCaretUpDown, PiCheckCircle, PiProhibit } from 'react-icons/pi';
import type { StammFahrzeugDto } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';

interface StammFahrzeugeTableProps {
  stammFahrzeuge: StammFahrzeugDto[];
  isLoading: boolean;
  onEdit: (fahrzeug: StammFahrzeugDto) => void;
  onArchive: (fahrzeug: StammFahrzeugDto) => void;
  updatingId?: string;
  archivingId?: string;
}

const columnHelper = createColumnHelper<StammFahrzeugDto>();

/**
 * StammFahrzeuge Tabelle mit Sortierung.
 *
 * Zeigt alle Stamm-Fahrzeuge mit Status-Badge und Aktionen.
 */
export const StammFahrzeugeTable = ({ stammFahrzeuge, isLoading, onEdit, onArchive, updatingId, archivingId }: StammFahrzeugeTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rufname', desc: false }]);

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

  const columns = useMemo(
    () => [
      columnHelper.accessor('rufname', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Rufname sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Rufname
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('funkrufname', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Funkrufname sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Funkrufname
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('fahrzeugtyp', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Fahrzeugtyp sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            Fahrzeugtyp
            <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="info" size="sm">
            {row.original.fahrzeugtyp.code}
          </Badge>
        ),
        sortingFn: (rowA, rowB) => rowA.original.fahrzeugtyp.code.localeCompare(rowB.original.fahrzeugtyp.code),
      }),
      columnHelper.accessor('kennzeichen', {
        header: 'Kennzeichen',
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('baujahr', {
        header: 'Baujahr',
        cell: (info) => <span className="text-gray-600 dark:text-gray-400">{info.getValue() || '—'}</span>,
      }),
      columnHelper.accessor('archivedAt', {
        header: 'Status',
        cell: ({ row }) =>
          !row.original.archivedAt ? (
            <Badge variant="success" size="sm">
              <PiCheckCircle className="mr-1" />
              Aktiv
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              <PiProhibit className="mr-1" />
              Archiviert
            </Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
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

  const table = useReactTable({
    data: stammFahrzeuge,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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

  if (stammFahrzeuge.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        <Text className="text-gray-600">Keine Fahrzeuge vorhanden.</Text>
        <Text className="text-gray-500 text-sm">Erstellen Sie ein neues Fahrzeug.</Text>
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
          const isRowUpdating = updatingId === row.original.id;
          const isRowArchiving = archivingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowArchiving;
          const isArchived = !!row.original.archivedAt;

          const rowClassName = [isArchived && 'opacity-60', isRowMutating && 'opacity-50 transition-opacity duration-200'].filter(Boolean).join(' ');

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
