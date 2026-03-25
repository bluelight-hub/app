/**
 * FuehrungsrhythmusStatistik Komponente
 *
 * Collapsible Panel mit Fuehrungsrhythmus-Statistiken und Detail-Tabelle.
 * Zeigt Zyklen, Abschlussrate, Eskalationen und Snooze-Raten pro Typ.
 *
 * **Story 9.8 ACs:**
 * - AC1: Zyklen, Snooze-Rate/Typ, Completion-Rate, Eskalationen
 * - AC2: Leerer Zustand
 * - AC3: Skeleton-Loading-State
 * - AC4: Error State
 * - AC5: WebSocket Cache-Invalidierung
 */

import { Fragment, useState } from 'react';
import { PiArrowsClockwise, PiCaretDown, PiCaretRight, PiCheckCircle, PiChartLineDown, PiHeartbeat, PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { Table } from '@/shared/ui/molecules/table.molecule';
import { EinsatzStatsCard } from '@/features/einsatz/ui/molecules/EinsatzStatsCard';
import { useFuehrungsrhythmusStatistik } from '../../api/queries';

interface FuehrungsrhythmusStatistikProps {
  einsatzId: string;
  className?: string;
}

export function FuehrungsrhythmusStatistik({ einsatzId, className }: FuehrungsrhythmusStatistikProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data, isLoading, isError, refetch } = useFuehrungsrhythmusStatistik(einsatzId);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 text-sm font-medium text-text-secondary" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiHeartbeat className="h-4 w-4" />
        Führungsrhythmus-Statistik
      </button>

      {isExpanded && (
        <>
          {/* AC3: Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
              </div>
              <Table.Skeleton rows={3} columns={4} />
            </div>
          )}

          {/* AC4: Error State */}
          {!isLoading && isError && (
            <div className="py-4 text-center text-sm text-status-danger-text">
              <p>Führungsrhythmus-Statistik konnte nicht geladen werden.</p>
              <button type="button" className="mt-1 underline hover:no-underline" onClick={() => refetch()}>
                Erneut versuchen
              </button>
            </div>
          )}

          {/* AC2: Empty State */}
          {!isLoading && !isError && data && data.totalActivations === 0 && <p className="py-4 text-center text-sm text-text-muted">Kein Führungsrhythmus in diesem Einsatz aktiviert</p>}

          {/* AC1: Daten anzeigen */}
          {!isLoading && !isError && data && data.totalActivations > 0 && (
            <div className="flex flex-col gap-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <EinsatzStatsCard title="Aktivierungen" value={data.totalActivations} icon={<PiHeartbeat className="h-6 w-6" />} />
                <EinsatzStatsCard title="Gesamt-Zyklen" value={data.totalCycles} icon={<PiArrowsClockwise className="h-6 w-6" />} />
                <EinsatzStatsCard title="Abschlussrate" value={`${(data.avgCompletionRate * 100).toFixed(1)}%`} icon={<PiCheckCircle className="h-6 w-6" />} variant="success" />
                <EinsatzStatsCard title="Eskalationen" value={data.totalEscalations} icon={<PiWarningCircle className="h-6 w-6" />} variant={data.totalEscalations > 0 ? 'danger' : 'default'} />
                <EinsatzStatsCard
                  title="Ø Eskalationsrate"
                  value={`${(
                    (data.totalActivations > 0 ? data.activations.reduce((sum, a) => sum + (a.reminderCount > 0 ? a.escalatedCount / a.reminderCount : 0), 0) / data.totalActivations : 0) * 100
                  ).toFixed(1)}%`}
                  icon={<PiChartLineDown className="h-6 w-6" />}
                  variant={data.totalEscalations > 0 ? 'danger' : 'default'}
                />
              </div>

              {/* Detail-Tabelle pro Erinnerungstyp */}
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Erinnerungstyp</Table.Head>
                    <Table.Head>Vorkommen</Table.Head>
                    <Table.Head>Snooze-Rate</Table.Head>
                    <Table.Head>Eskalationsrate</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {data.activations.length > 1
                    ? data.activations.map((activation, idx) => (
                        <Fragment key={activation.activationTimestamp}>
                          <Table.Row className="bg-surface-raised">
                            <Table.Cell colSpan={4} className="text-xs font-medium text-text-secondary">
                              Aktivierung {idx + 1} — {new Date(activation.activationTimestamp).toLocaleString('de-DE')} (Zyklen: {activation.totalCycles}, Abschluss:{' '}
                              {(activation.completionRate * 100).toFixed(1)}%)
                            </Table.Cell>
                          </Table.Row>
                          {activation.reminderTypeStats.map((stat) => (
                            <Table.Row key={`${activation.activationTimestamp}-${stat.reminderType}`}>
                              <Table.Cell className="pl-6">{stat.reminderType}</Table.Cell>
                              <Table.Cell>{stat.totalOccurrences}</Table.Cell>
                              <Table.Cell>{(stat.snoozeRate * 100).toFixed(1)}%</Table.Cell>
                              <Table.Cell>{(stat.escalationRate * 100).toFixed(1)}%</Table.Cell>
                            </Table.Row>
                          ))}
                        </Fragment>
                      ))
                    : data.activations.flatMap((activation) =>
                        activation.reminderTypeStats.map((stat) => (
                          <Table.Row key={`${activation.activationTimestamp}-${stat.reminderType}`}>
                            <Table.Cell>{stat.reminderType}</Table.Cell>
                            <Table.Cell>{stat.totalOccurrences}</Table.Cell>
                            <Table.Cell>{(stat.snoozeRate * 100).toFixed(1)}%</Table.Cell>
                            <Table.Cell>{(stat.escalationRate * 100).toFixed(1)}%</Table.Cell>
                          </Table.Row>
                        )),
                      )}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </>
      )}
    </div>
  );
}
