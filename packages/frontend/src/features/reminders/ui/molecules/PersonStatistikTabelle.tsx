/**
 * PersonStatistikTabelle Komponente
 *
 * Collapsible Panel mit Tabelle fuer Personen-Statistiken.
 * Zeigt pro Teilnehmer: Zugewiesen, Acknowledged, Eskalationen, Avg Reaktionszeit.
 *
 * **Story 9.2 ACs:**
 * - AC1: Statistiken pro Teilnehmer
 * - AC2: Teilnehmer ohne Erinnerungen mit 0-Werten
 * - AC3: Skeleton-Loading-State
 * - AC4: Leerer Zustand mit Hinweis
 */

import { useState, useMemo } from 'react';
import { PiCaretDown, PiCaretRight, PiUsers } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { usePersonStatistik } from '../../api/queries';

type SortField = 'userName' | 'zugewiesen' | 'acknowledged' | 'eskalationen' | 'avgReaktionszeitSeconds';
type SortDirection = 'asc' | 'desc';

interface PersonStatistikTabelleProps {
  einsatzId: string;
  className?: string;
}

export function PersonStatistikTabelle({ einsatzId, className }: PersonStatistikTabelleProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortField, setSortField] = useState<SortField>('zugewiesen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data, isLoading, isError } = usePersonStatistik(einsatzId);

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
      // null-Werte ans Ende
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

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 text-sm font-medium text-text-secondary" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiUsers className="h-4 w-4" />
        Personen-Statistik
      </button>

      {isExpanded && (
        <>
          {isLoading && <Table.Skeleton rows={3} columns={5} />}

          {!isLoading && isError && <p className="py-4 text-center text-sm text-status-danger-text">Statistiken konnten nicht geladen werden.</p>}

          {!isLoading && !isError && sortedItems.length === 0 && <p className="py-4 text-center text-sm text-text-muted">Keine Teilnehmer im Einsatz vorhanden.</p>}

          {!isLoading && !isError && sortedItems.length > 0 && (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head sortable sorted={getSorted('userName')} onClick={() => handleSort('userName')}>
                    Name
                  </Table.Head>
                  <Table.Head sortable sorted={getSorted('zugewiesen')} onClick={() => handleSort('zugewiesen')}>
                    Zugewiesen
                  </Table.Head>
                  <Table.Head sortable sorted={getSorted('acknowledged')} onClick={() => handleSort('acknowledged')}>
                    Acknowledged
                  </Table.Head>
                  <Table.Head sortable sorted={getSorted('eskalationen')} onClick={() => handleSort('eskalationen')}>
                    Eskalationen
                  </Table.Head>
                  <Table.Head sortable sorted={getSorted('avgReaktionszeitSeconds')} onClick={() => handleSort('avgReaktionszeitSeconds')}>
                    Ø Reaktionszeit
                  </Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sortedItems.map((item) => (
                  <Table.Row key={item.userId}>
                    <Table.Cell>{item.userName}</Table.Cell>
                    <Table.Cell>{item.zugewiesen}</Table.Cell>
                    <Table.Cell>{item.acknowledged}</Table.Cell>
                    <Table.Cell>{item.eskalationen}</Table.Cell>
                    <Table.Cell>{item.avgReaktionszeitSeconds !== null ? formatDuration(item.avgReaktionszeitSeconds) : '–'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </>
      )}
    </div>
  );
}
