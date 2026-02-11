/**
 * EskalationsAnalyse Komponente
 *
 * Collapsible Panel mit Eskalations-Statistiken und Detail-Tabelle.
 * Zeigt Eskalationsrate, Top-Empfänger/Quellen und Einzelaufstellung.
 *
 * **Story 9.4 ACs:**
 * - AC1: Summary-KPIs (Gesamt, Rate, Ø Zeit, Top-Listen)
 * - AC2: Sortierbare Detail-Tabelle
 * - AC3: Skeleton-Loading-State
 * - AC4: Leerer Zustand
 * - AC5: Error State
 */

import { useState, useMemo } from 'react';
import { PiCaretDown, PiCaretRight, PiWarningCircle } from 'react-icons/pi';
import { format } from 'date-fns';
import { cn } from '@/shared/ui/cn';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { EinsatzStatsCard } from '@/features/einsatz/ui/molecules/EinsatzStatsCard';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { useEskalationsAnalyse } from '../../api/queries';

type SortField = 'titel' | 'ausgeloestAm' | 'eskaliertAm' | 'zeitBisEskalationSeconds' | 'eskaliertAn' | 'previousAssignee';
type SortDirection = 'asc' | 'desc';

interface EskalationsAnalyseProps {
  einsatzId: string;
  className?: string;
}

export function EskalationsAnalyse({ einsatzId, className }: EskalationsAnalyseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortField, setSortField] = useState<SortField>('eskaliertAm');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data, isLoading, isError, refetch } = useEskalationsAnalyse(einsatzId);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data?.items, sortField, sortDirection]);

  const getSorted = (field: SortField): 'asc' | 'desc' | false => {
    return sortField === field ? sortDirection : false;
  };

  const formatTimestamp = (iso: string) => format(new Date(iso), 'dd.MM. HH:mm');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 font-medium text-gray-700 text-sm dark:text-gray-300" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiWarningCircle className="h-4 w-4" />
        Eskalations-Analyse
      </button>

      {isExpanded && (
        <>
          {/* AC3: Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <Table.Skeleton rows={3} columns={6} />
            </div>
          )}

          {/* AC5: Error State */}
          {!isLoading && isError && (
            <div className="py-4 text-center text-red-600 text-sm dark:text-red-400">
              <p>Eskalations-Analyse konnte nicht geladen werden.</p>
              <button type="button" className="mt-1 underline hover:no-underline" onClick={() => refetch()}>
                Erneut versuchen
              </button>
            </div>
          )}

          {/* AC4: Empty State */}
          {!isLoading && !isError && data && data.totalEscalated === 0 && <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Keine Eskalationen in diesem Einsatz</p>}

          {/* AC1 + AC2: Daten anzeigen */}
          {!isLoading && !isError && data && data.totalEscalated > 0 && (
            <div className="flex flex-col gap-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <EinsatzStatsCard title="Eskalationen gesamt" value={data.totalEscalated} icon={<PiWarningCircle className="h-6 w-6" />} variant="danger" />
                <EinsatzStatsCard title="Eskalationsrate" value={`${(data.eskalationsRate * 100).toFixed(1)}%`} icon={<PiWarningCircle className="h-6 w-6" />} variant="danger" />
                <EinsatzStatsCard title="Ø Zeit bis Eskalation" value={formatDuration(data.avgZeitBisEskalationSeconds)} icon={<PiWarningCircle className="h-6 w-6" />} variant="warning" />
              </div>

              {/* Top-Listen */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-slate-600 text-sm dark:text-slate-400">Häufigste Empfänger</h4>
                  {data.topReceivers.length > 0 ? (
                    <ol className="mt-1 list-inside list-decimal">
                      {data.topReceivers.map((r) => (
                        <li key={r.userId} className="text-slate-700 text-sm dark:text-slate-300">
                          {r.userName} ({r.count})
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-gray-400 text-sm">Keine Daten</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-slate-600 text-sm dark:text-slate-400">Häufigste Quellen</h4>
                  {data.topSources.length > 0 ? (
                    <ol className="mt-1 list-inside list-decimal">
                      {data.topSources.map((s) => (
                        <li key={s.userId} className="text-slate-700 text-sm dark:text-slate-300">
                          {s.userName} ({s.count})
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-gray-400 text-sm">Keine Daten</p>
                  )}
                </div>
              </div>

              {/* Detail-Tabelle */}
              {sortedItems.length > 0 && (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head sortable sorted={getSorted('titel')} onClick={() => handleSort('titel')}>
                        Titel
                      </Table.Head>
                      <Table.Head sortable sorted={getSorted('ausgeloestAm')} onClick={() => handleSort('ausgeloestAm')}>
                        Ausgelöst am
                      </Table.Head>
                      <Table.Head sortable sorted={getSorted('eskaliertAm')} onClick={() => handleSort('eskaliertAm')}>
                        Eskaliert am
                      </Table.Head>
                      <Table.Head sortable sorted={getSorted('zeitBisEskalationSeconds')} onClick={() => handleSort('zeitBisEskalationSeconds')}>
                        Dauer
                      </Table.Head>
                      <Table.Head sortable sorted={getSorted('eskaliertAn')} onClick={() => handleSort('eskaliertAn')}>
                        Eskaliert an
                      </Table.Head>
                      <Table.Head sortable sorted={getSorted('previousAssignee')} onClick={() => handleSort('previousAssignee')}>
                        Vorheriger Assignee
                      </Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {sortedItems.map((item) => (
                      <Table.Row key={item.erinnerungId}>
                        <Table.Cell>{item.titel}</Table.Cell>
                        <Table.Cell>{formatTimestamp(item.ausgeloestAm)}</Table.Cell>
                        <Table.Cell>{formatTimestamp(item.eskaliertAm)}</Table.Cell>
                        <Table.Cell>{formatDuration(item.zeitBisEskalationSeconds)}</Table.Cell>
                        <Table.Cell>{item.eskaliertAn}</Table.Cell>
                        <Table.Cell>{item.previousAssignee ?? '–'}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
