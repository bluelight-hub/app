/**
 * ReaktionszeitStatistik Komponente
 *
 * Collapsible Panel mit Reaktionszeit-Metriken und Histogramm.
 * Zeigt Avg, Median, Min, Max und Bucket-Verteilung als BarChart.
 *
 * **Story 9.5 ACs:**
 * - AC1: Summary Cards (Avg, Median, Min, Max)
 * - AC2: Histogramm mit Bucket-Verteilung
 * - AC3: Skeleton-Loading-State
 * - AC4: Leerer Zustand
 * - AC5: Error State mit Retry
 */

import { useState } from 'react';
import { PiCaretDown, PiCaretRight, PiTimer } from 'react-icons/pi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/shared/ui/cn';
import { EinsatzStatsCard } from '@/features/einsatz/ui/molecules/EinsatzStatsCard';
import { formatDuration } from '@/shared/lib/dateFormatter';
import { useReaktionszeitStatistik } from '../../api/queries';

interface ReaktionszeitStatistikProps {
  einsatzId: string;
  className?: string;
}

export function ReaktionszeitStatistik({ einsatzId, className }: ReaktionszeitStatistikProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data, isLoading, isError, refetch } = useReaktionszeitStatistik(einsatzId);

  const chartData = data?.buckets.map((b) => ({
    label: b.label,
    count: b.count,
  }));

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 font-medium text-gray-700 text-sm dark:text-gray-300" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        <PiTimer className="h-4 w-4" />
        Reaktionszeit-Statistik
      </button>

      {isExpanded && (
        <>
          {/* AC3: Loading State */}
          {isLoading && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-[250px] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {/* AC5: Error State */}
          {!isLoading && isError && (
            <div className="py-4 text-center text-red-600 text-sm dark:text-red-400">
              <p>Reaktionszeit-Statistik konnte nicht geladen werden.</p>
              <button type="button" className="mt-1 underline hover:no-underline" onClick={() => refetch()}>
                Erneut versuchen
              </button>
            </div>
          )}

          {/* AC4: Empty State */}
          {!isLoading && !isError && data && data.totalAcknowledged === 0 && <p className="py-4 text-center text-gray-500 text-sm dark:text-gray-400">Keine Reaktionsdaten vorhanden</p>}

          {/* AC1 + AC2: Daten anzeigen */}
          {!isLoading && !isError && data && data.totalAcknowledged > 0 && (
            <div className="flex flex-col gap-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <EinsatzStatsCard title="Ø Reaktionszeit" value={formatDuration(data.avgReaktionszeitSeconds)} icon={<PiTimer className="h-6 w-6" />} variant="default" />
                <EinsatzStatsCard title="Median" value={formatDuration(data.medianReaktionszeitSeconds)} icon={<PiTimer className="h-6 w-6" />} variant="default" />
                <EinsatzStatsCard title="Schnellste" value={formatDuration(data.minReaktionszeitSeconds)} icon={<PiTimer className="h-6 w-6" />} variant="success" />
                <EinsatzStatsCard title="Langsamste" value={formatDuration(data.maxReaktionszeitSeconds)} icon={<PiTimer className="h-6 w-6" />} variant="danger" />
              </div>

              {/* Histogramm */}
              {chartData && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} accessibilityLayer>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value: number) => [`${value} Erinnerungen`, 'Anzahl']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Erinnerungen" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
