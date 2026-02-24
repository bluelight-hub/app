/**
 * BefehlMetrikenDashboard Organism
 *
 * Zeigt aggregierte Adoptionsmetriken und Dokumentationsqualitaet
 * ueber alle Einsaetze in einem konfigurierbaren Zeitraum.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 *
 * ACs: AC2-AC10
 */

import { useMemo, useState } from 'react';
import { PiChartBar, PiClockCountdown, PiFileText, PiPercent, PiTrendUp, PiWarningCircle } from 'react-icons/pi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/shared/ui/cn';
import { EinsatzStatsCard } from '@/features/einsatz/ui/molecules/EinsatzStatsCard';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { useBefehlMetriken } from '../../api/use-befehl-metriken';
import type { EinsatzMetrikDto } from '@/shared';

type ZeitraumPreset = '7d' | '30d' | '90d' | 'custom';

const PRESET_LABELS: Record<Exclude<ZeitraumPreset, 'custom'>, string> = {
  '7d': '7 Tage',
  '30d': '30 Tage',
  '90d': '90 Tage',
};

function getPresetDates(preset: Exclude<ZeitraumPreset, 'custom'>): { von: string; bis: string } {
  const bis = new Date();
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const von = new Date(bis.getTime() - days * 24 * 60 * 60 * 1000);
  return { von: von.toISOString(), bis: bis.toISOString() };
}

interface BefehlMetrikenDashboardProps {
  className?: string;
}

export function BefehlMetrikenDashboard({ className }: BefehlMetrikenDashboardProps) {
  const [preset, setPreset] = useState<ZeitraumPreset>('30d');
  const [customVon, setCustomVon] = useState('');
  const [customBis, setCustomBis] = useState('');
  const [showDrillDown, setShowDrillDown] = useState(false);

  // C1-Fix: Custom-Zeitraum nur ausfuehren wenn beide Daten gesetzt
  const isCustomComplete = preset === 'custom' && customVon !== '' && customBis !== '';

  const queryParams = useMemo(() => {
    if (isCustomComplete) {
      return { von: new Date(customVon).toISOString(), bis: new Date(customBis).toISOString() };
    }
    if (preset !== 'custom') {
      return getPresetDates(preset);
    }
    return { von: undefined, bis: undefined };
  }, [preset, customVon, customBis, isCustomComplete]);

  const { data, isLoading, isError, refetch } = useBefehlMetriken(queryParams, {
    enabled: preset !== 'custom' || isCustomComplete,
  });

  const chartData = useMemo(() => {
    if (!data?.einsatzDetails?.length) return [];
    return data.einsatzDetails.map((e: EinsatzMetrikDto) => ({
      name: e.alarmstichwort || 'k.A.',
      befehle: e.befehlAnzahl,
      qualitaet: e.dokumentationsqualitaetProzent,
    }));
  }, [data]);

  const isLeerzustand = data && data.gesamtBefehle === 0;

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* AC7: Zeitraum-Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PRESET_LABELS) as Array<Exclude<ZeitraumPreset, 'custom'>>).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            aria-pressed={preset === p}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              preset === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset('custom')}
          aria-pressed={preset === 'custom'}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            preset === 'custom' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
          )}
        >
          Benutzerdefiniert
        </button>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customVon}
              onChange={(e) => setCustomVon(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Von-Datum"
            />
            <span className="text-gray-500 text-sm">bis</span>
            <input
              type="date"
              value={customBis}
              onChange={(e) => setCustomBis(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Bis-Datum"
            />
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="h-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
          <div className="h-[300px] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="py-8 text-center text-red-600 dark:text-red-400">
          <PiWarningCircle className="mx-auto mb-2 h-8 w-8" />
          <p className="font-medium">Metriken konnten nicht geladen werden</p>
          <button type="button" className="mt-2 text-sm underline hover:no-underline" onClick={() => refetch()}>
            Erneut versuchen
          </button>
        </div>
      )}

      {/* AC10: Leerzustand */}
      {!isLoading && !isError && isLeerzustand && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <PiChartBar className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" />
          <p className="font-medium text-gray-600 dark:text-gray-300">Keine Befehlsdaten im gewählten Zeitraum</p>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
            Im Zeitraum {data.vonDatum.toLocaleDateString('de-DE')} – {data.bisDatum.toLocaleDateString('de-DE')} wurden {data.gesamtEinsaetze} Einsaetze gefunden, aber keine Befehle erfasst.
          </p>
        </div>
      )}

      {/* AC2-AC6: Metrik-Cards + Chart */}
      {!isLoading && !isError && data && !isLeerzustand && (
        <>
          {/* Metrik-Cards Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {/* AC2: Erfassungszeit */}
            <EinsatzStatsCard
              title="Erfassungszeit"
              value={data.erfassungszeitMedianSekunden != null ? formatDuration(data.erfassungszeitMedianSekunden) : '–'}
              icon={<PiClockCountdown className="h-6 w-6" />}
              description="Median erteilt → zugestellt (Ziel: ≤10s)"
              variant={data.erfassungszeitMedianSekunden != null && data.erfassungszeitMedianSekunden <= 10 ? 'success' : 'warning'}
            />

            {/* AC3: Quittierungszeit */}
            <EinsatzStatsCard
              title="Quittierungszeit"
              value={data.quittierungszeitMedianSekunden != null ? formatDuration(data.quittierungszeitMedianSekunden) : '–'}
              icon={<PiClockCountdown className="h-6 w-6" />}
              description="Median zugestellt → quittiert (Ziel: ≤5s)"
              variant={data.quittierungszeitMedianSekunden != null && data.quittierungszeitMedianSekunden <= 5 ? 'success' : 'warning'}
            />

            {/* AC4: Papier-Rueckfallquote */}
            <EinsatzStatsCard
              title="Papier-Rueckfall"
              value={`${data.papierRueckfallquoteProzent.toFixed(0)}%`}
              icon={<PiFileText className="h-6 w-6" />}
              description={`${data.gesamtEinsaetze - data.einsaetzeMitBefehlen} von ${data.gesamtEinsaetze} ohne Befehle (Ziel: 0%)`}
              variant={data.papierRueckfallquoteProzent === 0 ? 'success' : data.papierRueckfallquoteProzent <= 20 ? 'warning' : 'danger'}
            />

            {/* AC5: Adoptionsrate */}
            <EinsatzStatsCard
              title="Adoptionsrate"
              value={`${data.adoptionsrateProzent.toFixed(0)}%`}
              icon={<PiTrendUp className="h-6 w-6" />}
              description={`${data.einsaetzeMitBefehlen} von ${data.gesamtEinsaetze} mit Befehlen (Ziel: 100%)`}
              variant={data.adoptionsrateProzent >= 100 ? 'success' : data.adoptionsrateProzent >= 80 ? 'warning' : 'danger'}
            />

            {/* AC6: Dokumentationsqualitaet */}
            <EinsatzStatsCard
              title="Dokumentation"
              value={`${data.dokumentationsqualitaetProzent.toFixed(0)}%`}
              icon={<PiPercent className="h-6 w-6" />}
              description={`Befehle vollstaendig quittiert (${data.gesamtBefehle} gesamt)`}
              variant={data.dokumentationsqualitaetProzent >= 90 ? 'success' : data.dokumentationsqualitaetProzent >= 70 ? 'warning' : 'danger'}
            />
          </div>

          {/* Chart: Befehle pro Einsatz */}
          {chartData.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 font-medium text-gray-900 text-sm dark:text-gray-100">Befehle pro Einsatz</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => [name === 'befehle' ? `${value} Befehle` : `${value}%`, name === 'befehle' ? 'Anzahl' : 'Doku-Qualitaet']} />
                  <Bar dataKey="befehle" fill="#3b82f6" radius={[4, 4, 0, 0]} name="befehle" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AC8: Pro-Einsatz-Drill-Down */}
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setShowDrillDown(!showDrillDown)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-900 text-sm dark:text-gray-100"
              aria-expanded={showDrillDown}
              aria-controls="drill-down-table"
            >
              <span>Pro-Einsatz-Breakdown ({data.einsatzDetails.length} Einsaetze)</span>
              <span className="text-gray-400">{showDrillDown ? '▲' : '▼'}</span>
            </button>

            {showDrillDown && (
              <div id="drill-down-table" className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Alarmstichwort
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium text-right">
                        Befehle
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium text-right">
                        Erfassungszeit
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium text-right">
                        Quittierungszeit
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium text-right">
                        Doku-Qualitaet
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Datum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.einsatzDetails.map((e: EinsatzMetrikDto) => (
                      <tr key={e.einsatzId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{e.alarmstichwort || 'k.A.'}</td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{e.befehlAnzahl}</td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                          {e.erfassungszeitMedianSekunden != null ? formatDuration(e.erfassungszeitMedianSekunden as number) : '–'}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                          {e.quittierungszeitMedianSekunden != null ? formatDuration(e.quittierungszeitMedianSekunden as number) : '–'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={cn(
                              'font-medium',
                              e.dokumentationsqualitaetProzent >= 90
                                ? 'text-green-600 dark:text-green-400'
                                : e.dokumentationsqualitaetProzent >= 70
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400',
                            )}
                          >
                            {e.dokumentationsqualitaetProzent.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.datum.toLocaleDateString('de-DE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
