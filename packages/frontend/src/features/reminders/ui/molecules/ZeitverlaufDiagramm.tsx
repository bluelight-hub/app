/**
 * Zeitverlauf-Diagramm Komponente
 *
 * Collapsible Panel mit Area Chart fuer den zeitlichen Verlauf
 * von Erinnerungen (Erstellt, Ausgeloest, Eskaliert).
 *
 * **Story 9.3 ACs:**
 * - AC1: Area-/Liniendiagramm mit Zeitachse (X) und Anzahl (Y)
 * - AC2: Automatische Zeitintervalle
 * - AC3: Zoom via Brush-Komponente
 * - AC4: Skeleton Loading
 * - AC5: Leerer Zustand
 */

import { useState } from 'react';
import { PiCaretDown, PiCaretRight, PiChartLine } from 'react-icons/pi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/shared/ui/cn';
import { useZeitverlaufStatistik } from '../../api/queries';

interface ZeitverlaufDiagrammProps {
  einsatzId: string;
  className?: string;
}

export function ZeitverlaufDiagramm({ einsatzId, className }: ZeitverlaufDiagrammProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data, isLoading, isError, refetch } = useZeitverlaufStatistik(einsatzId);

  const chartData = data?.buckets
    .map((b) => {
      const ts = new Date(b.timestamp).getTime();
      if (Number.isNaN(ts)) return null;
      return {
        timestamp: ts,
        erstellt: b.erstellt,
        ausgeloest: b.ausgeloest,
        eskaliert: b.eskaliert,
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button type="button" className="flex items-center gap-1 font-medium text-gray-700 text-sm dark:text-gray-300" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {isExpanded ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
        Zeitverlauf
      </button>

      {isExpanded && (
        <>
          {isLoading && <div data-testid="zeitverlauf-skeleton" className="h-[300px] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />}

          {isError && (
            <div className="text-red-600 text-sm dark:text-red-400">
              <p>Fehler beim Laden der Zeitverlauf-Statistiken.</p>
              <button type="button" className="mt-1 underline hover:no-underline" onClick={() => refetch()}>
                Erneut versuchen
              </button>
            </div>
          )}

          {!isLoading && !isError && (!chartData || chartData.length === 0) && (
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-slate-300 border-dashed dark:border-slate-600">
              <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                <PiChartLine className="h-8 w-8" />
                <p className="text-sm">Noch keine Erinnerungen vorhanden</p>
              </div>
            </div>
          )}

          {!isLoading && !isError && chartData && chartData.length > 0 && (
            <div role="img" aria-label="Zeitverlauf-Diagramm: Erstellte, ausgeloeste und eskalierte Erinnerungen ueber Zeit">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(ts: number) => format(new Date(ts), 'HH:mm')} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(ts) => format(new Date(ts as number), 'dd.MM. HH:mm')} />
                  <Area type="monotone" dataKey="erstellt" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Erstellt" />
                  <Area type="monotone" dataKey="ausgeloest" stackId="1" stroke="#f59e0b" fill="#fcd34d" name="Ausgelöst" />
                  <Area type="monotone" dataKey="eskaliert" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Eskaliert" />
                  <Brush dataKey="timestamp" height={30} stroke="#8884d8" tickFormatter={(ts: number) => format(new Date(ts), 'HH:mm')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
