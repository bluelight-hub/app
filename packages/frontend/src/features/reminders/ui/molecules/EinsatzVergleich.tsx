/**
 * EinsatzVergleich Komponente
 *
 * Collapsible Panel mit Einsatz-Selektor und Vergleichstabelle.
 * Vergleicht Erinnerungs-Metriken ueber mehrere Einsaetze.
 *
 * **Story 9.9 ACs:**
 * - AC1: Vergleichbare Einsaetze laden
 * - AC2: Einsaetze auswaehlen
 * - AC3: Erinnerungen pro Stunde
 * - AC4: Eskalationsrate
 * - AC5: Durchschnittliche Reaktionszeit
 * - AC6: Visueller Vergleich
 */

import { useState, useMemo } from 'react';
import { PiCaretDown, PiCaretRight, PiChartBar, PiCheck } from 'react-icons/pi';
import { format } from 'date-fns';
import { cn } from '@/shared/ui/cn';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { useEinsatzVergleich } from '../../api/queries';
import { useEinsaetzeQuery } from '@/features/einsatz/api/use-einsaetze-query';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EinsatzVergleichProps {
  einsatzId: string;
  className?: string;
}

const COMPLETED_STATUS = new Set(['ABGESCHLOSSEN', 'ARCHIVIERT']);

export function EinsatzVergleich({ einsatzId, className }: EinsatzVergleichProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedEinsatzIds, setSelectedEinsatzIds] = useState<string[]>([]);

  // AC1: Vergleichbare Einsaetze laden (abgeschlossen/archiviert)
  const { data: einsaetzeData } = useEinsaetzeQuery({ limit: 100 });
  const verfuegbareEinsaetze = useMemo(() => {
    if (!einsaetzeData?.data) return [];
    return einsaetzeData.data.filter((e) => e.id !== einsatzId && COMPLETED_STATUS.has(e.status));
  }, [einsaetzeData?.data, einsatzId]);

  // AC2: Vergleichsdaten laden
  const { data, isLoading, isError, refetch } = useEinsatzVergleich(einsatzId, selectedEinsatzIds);

  // AC6: Chart-Daten
  const chartData = useMemo(() => {
    if (!data?.items) return [];
    // noinspection JSNonASCIINames
    return data.items.map((item) => ({
      name: item.alarmstichwort ?? item.einsatzId.slice(0, 8),
      'Erinnerungen/h': item.erinnerungenProStunde,
      'Eskalationsrate (%)': item.eskalationsrate,
      'Ø Reaktionszeit (s)': item.durchschnittlicheReaktionszeit ?? 0,
    }));
  }, [data?.items]);

  const formatTimestamp = (iso: string) => format(new Date(iso), 'dd.MM.yy HH:mm');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 text-sm font-medium text-text-secondary" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiChartBar className="h-4 w-4" />
        Einsatz-Vergleich
      </button>

      {isExpanded && (
        <>
          {/* AC1: Einsatz-Selektor */}
          {verfuegbareEinsaetze.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">Keine abgeschlossenen Einsätze zum Vergleich verfügbar</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Listbox as="div" value={selectedEinsatzIds} onChange={setSelectedEinsatzIds} multiple>
                  <ListboxButton className="relative w-full cursor-pointer rounded-control border border-border-subtle bg-surface-panel py-2 pr-10 pl-3 text-left text-sm shadow-sm focus:border-action-primary focus:outline-none focus-visible:shadow-focus-ring">
                    {selectedEinsatzIds.length === 0 ? 'Einsätze zum Vergleich auswählen...' : `${selectedEinsatzIds.length} Einsatz/Einsätze ausgewählt`}
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-panel bg-surface-panel py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {verfuegbareEinsaetze.map((e) => (
                      <ListboxOption
                        key={e.id}
                        value={e.id}
                        className={({ focus }) => cn('relative cursor-pointer py-2 pr-9 pl-3 select-none', focus ? 'bg-action-primary text-text-inverse' : 'text-text-primary')}
                      >
                        {({ selected }) => (
                          <>
                            <span className={cn('block truncate', selected && 'font-semibold')}>
                              {e.alarmstichwort ?? 'Einsatz'} – {e.alarmierungszeit ? formatTimestamp(e.alarmierungszeit) : 'k.A.'}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                                <PiCheck className="h-4 w-4" />
                              </span>
                            )}
                          </>
                        )}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </Listbox>
              </div>

              {/* Keine Auswahl State */}
              {selectedEinsatzIds.length === 0 && <p className="py-4 text-center text-sm text-text-muted">Einsätze zum Vergleich auswählen</p>}

              {/* Loading State */}
              {selectedEinsatzIds.length > 0 && isLoading && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                    <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                    <div className="h-20 animate-pulse rounded-lg bg-surface-raised" />
                  </div>
                  <div className="h-64 animate-pulse rounded-lg bg-surface-raised" />
                </div>
              )}

              {/* Error State */}
              {selectedEinsatzIds.length > 0 && !isLoading && isError && (
                <div className="py-4 text-center text-sm text-status-danger-text">
                  <p>Vergleichsdaten konnten nicht geladen werden.</p>
                  <button type="button" className="mt-1 underline hover:no-underline" onClick={() => refetch()}>
                    Erneut versuchen
                  </button>
                </div>
              )}

              {/* AC3-6: Daten anzeigen */}
              {selectedEinsatzIds.length > 0 && !isLoading && !isError && data && (
                <div className="flex flex-col gap-4">
                  {/* Vergleichstabelle */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-subtle text-sm">
                      <thead>
                        <tr className="text-left text-text-secondary">
                          <th className="px-3 py-2 font-medium">Einsatz</th>
                          <th className="px-3 py-2 text-right font-medium">Erinnerungen</th>
                          <th className="px-3 py-2 text-right font-medium">Erinn./h</th>
                          <th className="px-3 py-2 text-right font-medium">Eskalationsrate</th>
                          <th className="px-3 py-2 text-right font-medium">Ø Reaktionszeit</th>
                          <th className="px-3 py-2 text-right font-medium">Dauer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {data.items.map((item) => (
                          <tr key={item.einsatzId} className={cn(item.einsatzId === einsatzId && 'bg-action-secondary')}>
                            <td className="px-3 py-2 font-medium text-text-primary">
                              {item.alarmstichwort ?? 'k.A.'}
                              {item.einsatzId === einsatzId && <span className="ml-1 text-xs text-action-primary">(aktuell)</span>}
                              {item.alarmierungszeit && <span className="ml-1 text-xs text-text-muted">{formatTimestamp(item.alarmierungszeit)}</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-text-secondary">{item.gesamtErinnerungen}</td>
                            <td className="px-3 py-2 text-right text-text-secondary">{item.erinnerungenProStunde.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={cn(
                                  'font-medium',
                                  item.eskalationsrate > 20 ? 'text-status-danger-text' : item.eskalationsrate > 10 ? 'text-status-warning-text' : 'text-status-success-text',
                                )}
                              >
                                {item.eskalationsrate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-text-secondary">{item.durchschnittlicheReaktionszeit !== null ? formatDuration(item.durchschnittlicheReaktionszeit) : '–'}</td>
                            <td className="px-3 py-2 text-right text-text-secondary">{item.dauer.toFixed(1)}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* AC6: Visueller Vergleich - Balkendiagramm */}
                  {chartData.length > 1 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Erinnerungen/h" fill="#3b82f6" />
                          <Bar dataKey="Eskalationsrate (%)" fill="#f59e0b" />
                          <Bar dataKey="Ø Reaktionszeit (s)" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
