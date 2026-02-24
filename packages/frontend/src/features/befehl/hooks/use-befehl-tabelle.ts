/**
 * useBefehlTabelle Hook - Tabellen-Logik fuer Befehlsuebersicht
 *
 * Kapselt @tanstack/react-table Konfiguration:
 * - 7 Spalten (Nummer, Befehlsgeber, Auftrag, Empfaenger-Count, Status, Fortschritt, Zeitpunkt)
 * - Client-seitige Sortierung, Filterung, Pagination
 * - Default: Nummer DESC, pageSize=20
 * - Reset auf Seite 1 bei Sortier-/Filter-Aenderung
 */

import type { BefehlDto, BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';
import type { ColumnFiltersState, PaginationState, SortingState } from '@tanstack/react-table';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { getBefehlKritikalitaet, getSortWeight } from '../lib/befehl-priority';
import { getQuittierungsfortschritt } from '../lib/befehl-utils';

/** Label fuer die Prioritaets-Anzeige */
function getPriorityLabel(befehl: BefehlDto): string {
  const kritikalitaet = getBefehlKritikalitaet(befehl);
  if (kritikalitaet === 'KRITISCH') return 'Kritisch';
  if (kritikalitaet === 'WARNUNG') return 'Warnung';
  return 'Normal';
}

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
        header: 'Priorität',
        enableSorting: true,
        cell: (info) => getPriorityLabel(info.row.original),
      }),
      columnHelper.accessor('nummer', {
        header: 'Nummer',
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
        header: 'Empfänger',
        enableSorting: true,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        enableSorting: true,
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
        header: 'Zeitpunkt',
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
