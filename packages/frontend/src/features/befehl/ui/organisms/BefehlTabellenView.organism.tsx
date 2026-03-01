/**
 * BefehlTabellenView Organism
 *
 * Tabellen-Darstellung der Befehle mit Sortierung, Filterung und Pagination.
 * Nutzt useBefehlTabelle() fuer @tanstack/react-table Logik und
 * shared Table.* Komponenten fuer die Darstellung.
 *
 * Row-Tinting: Zeilen werden farbig hinterlegt basierend auf Kritikalitaet/Status.
 */

import { type BefehlDto, BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';
import { type Cell, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import { PiTable } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { useBefehleByEinsatz } from '../../api/use-befehle-by-einsatz';
import { useBefehlTabelle } from '../../hooks/use-befehl-tabelle';
import { getBefehlKritikalitaet } from '../../lib/befehl-priority';
import { getQuittierungsfortschritt } from '../../lib/befehl-utils';
import { AlarmDot } from '../atoms/AlarmDot.atom';
import { ZustellstatusAnzeige } from '../molecules/ZustellstatusAnzeige.molecule';
import { BefehlPagination } from '../molecules/BefehlPagination.molecule';

/** Spalten-IDs die auf Tablet (< lg) ausgeblendet werden */
const HIDDEN_ON_TABLET = new Set(['befehlsgeberName', 'empfaengerCount']);

interface BefehlTabellenViewProps {
  einsatzId: string;
  /** Vorgefilterte Befehle vom Parent. Wenn nicht uebergeben, werden alle Befehle geladen. */
  befehle?: BefehlDto[];
  className?: string;
  onBefehlSelect?: (befehlId: string) => void;
  selectedBefehlId?: string;
}

/** Berechnet Row-Tinting CSS-Klassen basierend auf Kritikalitaet und Status */
function getRowTintClass(befehl: BefehlDto): string | undefined {
  if (befehl.status === BefehlDtoStatusEnum.Korrigiert) return undefined; // opacity-60 wird separat behandelt
  const kritikalitaet = getBefehlKritikalitaet(befehl);
  if (kritikalitaet === 'KRITISCH') return 'bg-red-50 dark:bg-red-950/20';
  if (kritikalitaet === 'WARNUNG') return 'bg-yellow-50 dark:bg-yellow-950/20';
  const fortschritt = getQuittierungsfortschritt(befehl.empfaenger);
  if (fortschritt.gesamt > 0 && fortschritt.quittiert === fortschritt.gesamt) return 'bg-green-50 dark:bg-green-950/20';
  return undefined;
}

/** Rendert eine einzelne Tabellenzelle mit Custom-Rendering fuer Prioritaet, Fortschritt, etc. */
function renderCell(cell: Cell<BefehlDto, unknown>) {
  const row = cell.row.original;

  switch (cell.column.id) {
    case 'prioritaet': {
      const kritikalitaet = getBefehlKritikalitaet(row);
      if (kritikalitaet === 'KRITISCH') {
        return <AlarmDot />;
      }
      if (kritikalitaet === 'WARNUNG') {
        return <span role="img" className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" aria-label="Warnung" />;
      }
      return <span role="img" className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" aria-label="Normal" />;
    }
    case 'nummer':
      return <span className="font-bold font-mono text-gray-900 text-sm dark:text-gray-100">{row.nummer}</span>;
    case 'fortschritt':
      return <ZustellstatusAnzeige empfaenger={row.empfaenger} variant="compact" />;
    case 'empfaengerCount': {
      const count = row.empfaenger?.length ?? 0;
      return <span className="text-gray-600 text-sm dark:text-gray-400">{count} Empf.</span>;
    }
    case 'erteiltAm':
      return (
        <time dateTime={row.erteiltAm.toISOString()} className="text-gray-500 text-sm dark:text-gray-400">
          {format(row.erteiltAm, 'dd.MM. HH:mm')}
        </time>
      );
    case 'auftrag':
      return (
        <span className="line-clamp-1 text-sm" title={row.auftrag}>
          {row.auftrag}
        </span>
      );
    default:
      return flexRender(cell.column.columnDef.cell, cell.getContext());
  }
}

const COLUMN_HEADERS = ['Prio', 'Nr.', 'Befehlsgeber', 'Auftrag', 'Empf.', 'Fortschritt', 'Zeit'];

export function BefehlTabellenView({ einsatzId, befehle: externalBefehle, className, onBefehlSelect, selectedBefehlId }: BefehlTabellenViewProps) {
  const { data: fetchedBefehle, isLoading } = useBefehleByEinsatz(einsatzId);
  const befehle = externalBefehle ?? fetchedBefehle;
  const { table } = useBefehlTabelle(befehle ?? []);

  if (!externalBefehle && isLoading) {
    return (
      <Table.Root className={className}>
        <Table.Header>
          <Table.Row>
            {COLUMN_HEADERS.map((header) => (
              <Table.Head key={header}>{header}</Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Skeleton rows={10} columns={7} />
      </Table.Root>
    );
  }

  if (!befehle?.length) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <PiTable className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400">Noch keine Befehle erteilt.</p>
        <p className="mt-1 text-gray-400 text-sm dark:text-gray-500">
          Erstelle den ersten Befehl mit <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:border-gray-600 dark:bg-gray-800">Ctrl+N</kbd>.
        </p>
      </div>
    );
  }

  const totalItems = table.getFilteredRowModel().rows.length;

  return (
    <div className={className}>
      <Table.Root>
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.Head
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  sortable={header.column.getCanSort()}
                  sorted={header.column.getIsSorted()}
                  className={cn(HIDDEN_ON_TABLET.has(header.column.id) && 'hidden lg:table-cell')}
                  aria-sort={header.column.getCanSort() ? (header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none') : undefined}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </Table.Head>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row
              key={row.id}
              onClick={() => onBefehlSelect?.(row.original.id)}
              className={cn(
                onBefehlSelect && 'cursor-pointer',
                selectedBefehlId === row.original.id && 'bg-primary-50 dark:bg-primary-900/20',
                row.original.status === BefehlDtoStatusEnum.Korrigiert && 'opacity-60',
                selectedBefehlId !== row.original.id && row.original.status !== BefehlDtoStatusEnum.Korrigiert && getRowTintClass(row.original),
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id} className={cn(HIDDEN_ON_TABLET.has(cell.column.id) && 'hidden lg:table-cell')}>
                  {renderCell(cell)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <BefehlPagination
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        totalItems={totalItems}
        pageSize={table.getState().pagination.pageSize}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
      />
    </div>
  );
}
