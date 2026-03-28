import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiPencilSimple, PiArchive, PiArrowCounterClockwise, PiArrowSquareOut, PiCaretUpDown, PiCheckCircle, PiProhibit } from 'react-icons/pi';
import { Link } from '@tanstack/react-router';
import type { StammPersonDto } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
interface StammPersonenTableProps {
  stammPersonen: StammPersonDto[];
  isLoading: boolean;
  onEdit: (person: StammPersonDto) => void;
  onArchive: (person: StammPersonDto) => void;
  onRestore: (person: StammPersonDto) => void;
  updatingId?: string;
  archivingId?: string;
  restoringId?: string;
}
const columnHelper = createColumnHelper<StammPersonDto>(); /** * StammPersonen Tabelle mit Sortierung. * * Zeigt alle Stamm-Personen mit Status-Badge und Aktionen. */
export const StammPersonenTable = ({ stammPersonen, isLoading, onEdit, onArchive, onRestore, updatingId, archivingId, restoringId }: StammPersonenTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'nachname', desc: false }]);
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
  const columns = useMemo(
    () => [
      columnHelper.accessor('personalnummer', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Personalnummer sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            {' '}
            Personalnr. <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
          </button>
        ),
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('nachname', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Nachname sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            {' '}
            Nachname <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
          </button>
        ),
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('vorname', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Vorname sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            {' '}
            Vorname <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
          </button>
        ),
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: 'userAccount',
        header: 'Benutzer-Account',
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
        cell: ({ row }) => {
          const quals = row.original.qualifikationen;
          if (!quals || quals.length === 0) {
            return <span className="text-text-muted">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {' '}
              {quals.slice(0, 3).map((q) => (
                <Badge key={q.id} variant="default" size="sm">
                  {' '}
                  {q.kuerzel}{' '}
                </Badge>
              ))}{' '}
              {quals.length > 3 && (
                <Badge variant="default" size="sm">
                  {' '}
                  +{quals.length - 3}{' '}
                </Badge>
              )}{' '}
            </div>
          );
        },
      }),
      columnHelper.accessor('archivedAt', {
        header: 'Status',
        cell: ({ row }) =>
          !row.original.archivedAt ? (
            <Badge variant="success" size="sm">
              {' '}
              <PiCheckCircle className="mr-1" /> Aktiv{' '}
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              {' '}
              <PiProhibit className="mr-1" /> Archiviert{' '}
            </Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowArchiving = archivingId === row.original.id;
          const isRowRestoring = restoringId === row.original.id;
          const isRowMutating = isRowUpdating || isRowArchiving || isRowRestoring;
          const isArchived = !!row.original.archivedAt;
          return (
            <div className="flex items-center gap-2">
              {' '}
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Person bearbeiten" disabled={isRowMutating || isArchived}>
                {' '}
                <PiPencilSimple />{' '}
              </IconButton>{' '}
              {!isArchived ? (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleArchive(row.original)} aria-label="Person archivieren" disabled={isRowMutating}>
                  {' '}
                  <PiArchive />{' '}
                </IconButton>
              ) : (
                <IconButton size="sm" intent="primary" appearance="minimal" onClick={() => handleRestore(row.original)} aria-label="Person wiederherstellen" disabled={isRowMutating}>
                  {' '}
                  <PiArrowCounterClockwise />{' '}
                </IconButton>
              )}{' '}
            </div>
          );
        },
      }),
    ],
    [handleEdit, handleArchive, handleRestore, updatingId, archivingId, restoringId],
  );
  const table = useReactTable({ data: stammPersonen, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  if (isLoading) {
    return (
      <div className="p-4">
        {' '}
        <div className="space-y-3">
          {' '}
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}{' '}
        </div>{' '}
      </div>
    );
  }
  if (stammPersonen.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        {' '}
        <Text className="text-text-secondary">Keine Personen vorhanden.</Text> <Text className="text-sm text-text-muted">Erstellen Sie eine neue Person.</Text>{' '}
      </div>
    );
  }
  return (
    <Table.Root>
      {' '}
      <Table.Header>
        {' '}
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {' '}
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              const ariaSort = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none';
              return (
                <Table.Head key={header.id} className="whitespace-nowrap" scope="col" aria-sort={header.column.getCanSort() ? ariaSort : undefined}>
                  {' '}
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}{' '}
                </Table.Head>
              );
            })}{' '}
          </Table.Row>
        ))}{' '}
      </Table.Header>{' '}
      <Table.Body>
        {' '}
        {table.getRowModel().rows.map((row) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowArchiving = archivingId === row.original.id;
          const isRowRestoring = restoringId === row.original.id;
          const isRowMutating = isRowUpdating || isRowArchiving || isRowRestoring;
          const isArchived = !!row.original.archivedAt;
          const rowClassName = [isArchived && 'opacity-60', isRowMutating && 'opacity-50 transition-opacity duration-200'].filter(Boolean).join(' ');
          return (
            <Table.Row key={row.id} className={rowClassName}>
              {' '}
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
              ))}{' '}
            </Table.Row>
          );
        })}{' '}
      </Table.Body>{' '}
    </Table.Root>
  );
};
