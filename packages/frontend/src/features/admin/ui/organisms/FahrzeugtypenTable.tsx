import { useCallback, useMemo, useState } from 'react';
import { type SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable, createColumnHelper } from '@tanstack/react-table';
import { PiCaretUpDown, PiCheckCircle, PiPencilSimple, PiProhibit } from 'react-icons/pi';
import { type FahrzeugtypDto, FAHRZEUGTYP_KATEGORIE_LABELS, getFahrzeugtypKategorieBadgeVariant } from '@/features/admin/api';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { Skeleton } from '@/shared/ui/atoms/skeleton';
import { Text } from '@/shared/ui/atoms/text.atom';
import { Table } from '@/shared/ui/molecules/table.molecule';
interface FahrzeugtypenTableProps {
  fahrzeugtypen: FahrzeugtypDto[];
  isLoading: boolean;
  onEdit: (fahrzeugtyp: FahrzeugtypDto) => void;
  onDeactivate: (fahrzeugtyp: FahrzeugtypDto) => void;
  updatingId?: string;
  deactivatingId?: string;
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
}; /** * Fahrzeugtypen Tabelle mit Sortierung. */
export const FahrzeugtypenTable = ({ fahrzeugtypen, isLoading, onEdit, onDeactivate, updatingId, deactivatingId }: FahrzeugtypenTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'code', desc: false }]);
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
  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Code sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            {' '}
            Code <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
          </button>
        ),
        cell: (info) => <span className="font-medium font-mono">{info.getValue()}</span>,
      }),
      columnHelper.accessor('bezeichnung', {
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            aria-label={`Nach Bezeichnung sortieren ${column.getIsSorted() === 'asc' ? 'absteigend' : 'aufsteigend'}`}
          >
            {' '}
            Bezeichnung <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
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
            {' '}
            Kategorie <PiCaretUpDown className="h-4 w-4" aria-hidden="true" />{' '}
          </button>
        ),
        cell: ({ row }) => <Badge variant={getFahrzeugtypKategorieBadgeVariant(row.original.kategorie)}>{FAHRZEUGTYP_KATEGORIE_LABELS[row.original.kategorie]}</Badge>,
      }),
      columnHelper.accessor('sollbesatzung', {
        header: 'Sollbesatzung',
        cell: ({ row }) => <span className="whitespace-nowrap text-text-secondary text-sm ">{formatSollbesatzungCompact(row.original.sollbesatzung)}</span>,
      }),
      columnHelper.accessor('istAktiv', {
        header: 'Status',
        cell: ({ row }) =>
          row.original.istAktiv ? (
            <Badge variant="success" size="sm">
              {' '}
              <PiCheckCircle className="mr-1" /> Aktiv{' '}
            </Badge>
          ) : (
            <Badge variant="error" size="sm">
              {' '}
              <PiProhibit className="mr-1" /> Deaktiviert{' '}
            </Badge>
          ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          const isRowUpdating = updatingId === row.original.id;
          const isRowDeactivating = deactivatingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeactivating;
          return (
            <div className="flex items-center gap-2">
              {' '}
              <IconButton size="sm" appearance="minimal" onClick={() => handleEdit(row.original)} aria-label="Fahrzeugtyp bearbeiten" disabled={isRowMutating}>
                {' '}
                <PiPencilSimple />{' '}
              </IconButton>{' '}
              {row.original.istAktiv && (
                <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => handleDeactivate(row.original)} aria-label="Fahrzeugtyp deaktivieren" disabled={isRowMutating}>
                  {' '}
                  <PiProhibit />{' '}
                </IconButton>
              )}{' '}
            </div>
          );
        },
      }),
    ],
    [handleDeactivate, handleEdit, updatingId, deactivatingId],
  );
  const table = useReactTable({ data: fahrzeugtypen, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
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
  if (fahrzeugtypen.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center p-8">
        {' '}
        <Text className="text-text-secondary">Keine Fahrzeugtypen vorhanden.</Text> <Text className="text-text-muted text-sm">Erstellen Sie einen neuen Fahrzeugtyp.</Text>{' '}
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
          const isRowDeactivating = deactivatingId === row.original.id;
          const isRowMutating = isRowUpdating || isRowDeactivating;
          const rowClassName = [!row.original.istAktiv && 'opacity-60', isRowMutating && 'opacity-50 transition-opacity duration-200'].filter(Boolean).join(' ');
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
