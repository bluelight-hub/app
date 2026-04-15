import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { PiMagnifyingGlass } from 'react-icons/pi';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { EmptyState } from '@/shared/ui/molecules/empty-state.molecule';
import { Alert } from '@/shared/ui/atoms/alert.atom';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { Input } from '@/shared/ui/atoms/input.atom';

export interface BulkAction {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'warning' | 'danger';
}

interface EmptyStateConfig {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  getRowId: (row: TData) => string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  searchable?: { placeholder: string } | false;
  pagination?: { defaultPageSize?: number; pageSizeOptions?: number[] } | false;
  bulkActions?: BulkAction[];
  emptyState?: EmptyStateConfig;
  defaultSorting?: SortingState;
  toolbar?: ReactNode;
}

const VARIANT_TO_INTENT = {
  default: 'secondary',
  warning: 'warning',
  danger: 'danger',
} as const;

/**
 * Wiederverwendbare DataTable-Komponente mit Suche, Paginierung, Sortierung und Bulk-Aktionen.
 *
 * Baut auf TanStack Table auf und nutzt die bestehenden Table-Moleküle.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  searchable,
  pagination,
  bulkActions,
  emptyState,
  defaultSorting = [],
  toolbar,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const allColumns: ColumnDef<TData, any>[] = bulkActions
    ? [
        {
          id: '_select',
          header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onChange={(checked) => table.toggleAllPageRowsSelected(checked)} />,
          cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onChange={(checked) => row.toggleSelected(checked)} />,
          enableSorting: false,
        },
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pagination !== false && { getPaginationRowModel: getPaginationRowModel() }),
    initialState: {
      pagination: pagination && pagination !== false ? { pageSize: pagination.defaultPageSize ?? 10 } : undefined,
    },
  });

  const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key]);
  const pageCount = table.getPageCount();
  const showPagination = pagination !== false && pageCount > 1;
  const pageSizeOptions = (pagination && pagination !== false && pagination.pageSizeOptions) || [10, 20, 50];

  // Ladezustand
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-64 animate-pulse rounded bg-surface-raised" />
        </div>
        <Table.Skeleton rows={5} columns={allColumns.length} />
      </div>
    );
  }

  // Fehlerzustand
  if (error) {
    return (
      <Alert status="error" title="Fehler" description={error.message}>
        {onRetry && (
          <div className="mt-2">
            <Button intent="danger" appearance="outline" size="sm" onClick={onRetry}>
              Erneut versuchen
            </Button>
          </div>
        )}
      </Alert>
    );
  }

  // Leerer Zustand
  if (data.length === 0 && emptyState) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(searchable || toolbar || (bulkActions && selectedIds.length > 0)) && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {searchable && (
              <Input type="text" value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder={searchable.placeholder} leftIcon={<PiMagnifyingGlass className="h-4 w-4" />} />
            )}
            {toolbar}
          </div>

          {bulkActions && selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{selectedIds.length} ausgewählt</span>
              {bulkActions.map((action) => {
                const ActionIcon = action.icon;
                return (
                  <Button key={action.label} intent={VARIANT_TO_INTENT[action.variant ?? 'default']} appearance="outline" size="sm" onClick={() => action.onClick(selectedIds)}>
                    <ActionIcon className="h-4 w-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabelle */}
      <Table.Root>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  sortable={header.column.getCanSort()}
                  sorted={header.column.getIsSorted()}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {/* Paginierung */}
      {showPagination && (
        <div className="border-border-primary flex items-center justify-between border-t px-2 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">
              Seite {table.getState().pagination.pageIndex + 1} von {pageCount}
            </span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="border-border-primary bg-surface-primary h-8 rounded-control border px-2 text-sm text-text-primary"
              aria-label="pro Seite"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} pro Seite
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button intent="secondary" appearance="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Zurück
            </Button>
            <Button intent="secondary" appearance="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Weiter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
