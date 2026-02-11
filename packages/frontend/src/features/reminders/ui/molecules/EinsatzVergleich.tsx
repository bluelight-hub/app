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
      <button type="button" className="flex items-center gap-1 font-medium text-gray-700 text-sm dark:text-gray-300" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiChartBar className="h-4 w-4" />
        Einsatz-Vergleich
      </button>

      {isExpanded && (
        <>
          {/* AC1: Einsatz-Selektor */}
          {verfuegbareEinsaetze.length === 0 ? (
            <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Keine abgeschlossenen Einsätze zum Vergleich verfügbar</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Listbox value={selectedEinsatzIds} onChange={setSelectedEinsatzIds} multiple>
                  <ListboxButton className="relative w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-2 pr-10 pl-3 text-left text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800">
                    {selectedEinsatzIds.length === 0 ? 'Einsätze zum Vergleich auswählen...' : `${selectedEinsatzIds.length} Einsatz/Einsätze ausgewählt`}
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-slate-800">
                    {verfuegbareEinsaetze.map((e) => (
                      <ListboxOption
                        key={e.id}
                        value={e.id}
                        className={({ focus }) => cn('relative cursor-pointer select-none py-2 pr-9 pl-3', focus ? 'bg-blue-600 text-white' : 'text-slate-900 dark:text-slate-100')}
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
              {selectedEinsatzIds.length === 0 && <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Einsätze zum Vergleich auswählen</p>}

              {/* Loading State */}
              {selectedEinsatzIds.length > 0 && isLoading && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                    <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
              )}

              {/* Error State */}
              {selectedEinsatzIds.length > 0 && !isLoading && isError && (
                <div className="py-4 text-center text-red-600 text-sm dark:text-red-400">
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
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                      <thead>
                        <tr className="text-left text-slate-600 dark:text-slate-400">
                          <th className="px-3 py-2 font-medium">Einsatz</th>
                          <th className="px-3 py-2 font-medium text-right">Erinnerungen</th>
                          <th className="px-3 py-2 font-medium text-right">Erinn./h</th>
                          <th className="px-3 py-2 font-medium text-right">Eskalationsrate</th>
                          <th className="px-3 py-2 font-medium text-right">Ø Reaktionszeit</th>
                          <th className="px-3 py-2 font-medium text-right">Dauer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.items.map((item) => (
                          <tr key={item.einsatzId} className={cn(item.einsatzId === einsatzId && 'bg-blue-50 dark:bg-blue-900/20')}>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                              {item.alarmstichwort ?? 'k.A.'}
                              {item.einsatzId === einsatzId && <span className="ml-1 text-blue-600 text-xs dark:text-blue-400">(aktuell)</span>}
                              {item.alarmierungszeit && <span className="ml-1 text-slate-500 text-xs">{formatTimestamp(item.alarmierungszeit)}</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{item.gesamtErinnerungen}</td>
                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{item.erinnerungenProStunde.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={cn(
                                  'font-medium',
                                  item.eskalationsrate > 20
                                    ? 'text-red-600 dark:text-red-400'
                                    : item.eskalationsrate > 10
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-green-600 dark:text-green-400',
                                )}
                              >
                                {item.eskalationsrate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                              {item.durchschnittlicheReaktionszeit !== null ? formatDuration(item.durchschnittlicheReaktionszeit) : '–'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">{item.dauer.toFixed(1)}h</td>
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
