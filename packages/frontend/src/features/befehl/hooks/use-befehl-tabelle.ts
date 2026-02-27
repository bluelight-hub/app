/**
 * useBefehlTabelle Hook - Tabellen-Logik fuer Befehlsuebersicht
 *
 * Kapselt @tanstack/react-table Konfiguration:
 * - 7 Spalten (Prio, Nr., Befehlsgeber, Auftrag, Empf., Fortschritt, Zeit)
 * - Client-seitige Sortierung, Filterung, Pagination
 * - Default: Prioritaet DESC, pageSize=20
 * - Status-Spalte entfernt (Status wird durch Row-Tinting kommuniziert)
 */

import type { BefehlDto, BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { getSortWeight } from '../lib/befehl-priority';
import { getQuittierungsfortschritt } from '../lib/befehl-utils';

const columnHelper = createColumnHelper<BefehlDto>();

const PAGE_SIZE = 20;

export function useBefehlTabelle(befehle: BefehlDto[]) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'prioritaet', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });

  const statusFilter = useMemo(() => {
    const filter = columnFilters.find((f) => f.id === 'status');
    return (filter?.value as BefehlDtoStatusEnum[]) ?? [];
  }, [columnFilters]);

  const setStatusFilter = useCallback((statuses: BefehlDtoStatusEnum[]) => {
    setColumnFilters((prev) => {
      const other = prev.filter((f) => f.id !== 'status');
      if (statuses.length === 0) return other;
      return [...other, { id: 'status', value: statuses }];
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const setFreitextFilter = useCallback((text: string) => {
    setGlobalFilter(text);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => getSortWeight(row), {
        id: 'prioritaet',
        header: 'Prio',
        enableSorting: true,
      }),
      columnHelper.accessor('nummer', {
        header: 'Nr.',
        enableSorting: true,
      }),
      columnHelper.accessor('befehlsgeberName', {
        header: 'Befehlsgeber',
        enableSorting: true,
      }),
      columnHelper.accessor('auftrag', {
        header: 'Auftrag',
        enableSorting: false,
        enableGlobalFilter: true,
      }),
      columnHelper.accessor((row) => row.empfaenger?.length ?? 0, {
        id: 'empfaengerCount',
        header: 'Empf.',
        enableSorting: true,
      }),
      /** Versteckter Status-Accessor fuer Column-Filter (nicht als sichtbare Spalte) */
      columnHelper.accessor('status', {
        header: 'Status',
        enableSorting: false,
        enableHiding: true,
        filterFn: (row, columnId, filterValue: BefehlDtoStatusEnum[]) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(row.getValue(columnId));
        },
      }),
      columnHelper.display({
        id: 'fortschritt',
        header: 'Fortschritt',
        enableSorting: false,
        cell: ({ row }) => {
          const fortschritt = getQuittierungsfortschritt(row.original.empfaenger);
          return `${fortschritt.quittiert}/${fortschritt.gesamt}`;
        },
      }),
      columnHelper.accessor('erteiltAm', {
        header: 'Zeit',
        enableSorting: true,
        cell: (info) => format(info.getValue(), 'dd.MM. HH:mm'),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: befehle,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      columnVisibility: { status: false },
    },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      return row.original.auftrag.toLowerCase().includes(String(filterValue).toLowerCase());
    },
  });

  return {
    table,
    sorting,
    statusFilter,
    setStatusFilter,
    freitextFilter: globalFilter,
    setFreitextFilter,
    pagination,
  };
}
