/**
 * WarnungList - Liste der letzten System-Warnungen
 *
 * Zeigt empfangene SystemWarnung-Events in chronologischer Reihenfolge.
 *
 * @remarks Story 5.6 AC3, AC4
 */

import type { SystemWarnungPayload } from '../../api';

const WARNUNG_TYP_LABELS: Record<string, string> = {
  ZUSTELLRATE: 'Zustellrate zu niedrig',
  OUTBOX_STAU: 'Outbox-Stau',
  LATENZ: 'Hohe Latenz',
  CIRCUIT_BREAKER: 'Circuit Breaker offen',
};

const WARNUNG_TYP_COLORS: Record<string, string> = {
  ZUSTELLRATE: 'text-red-400',
  OUTBOX_STAU: 'text-yellow-400',
  LATENZ: 'text-orange-400',
  CIRCUIT_BREAKER: 'text-red-400',
};

interface WarnungListProps {
  warnungen: SystemWarnungPayload[];
}

function getWarnungKeyBase(warnung: SystemWarnungPayload): string {
  return [warnung.timestamp, warnung.warnungTyp, String(warnung.aktuellerWert), String(warnung.schwellwert)].join('|');
}

export function WarnungList({ warnungen }: WarnungListProps) {
  if (warnungen.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="mb-2 font-medium text-gray-400 text-sm">Letzte Warnungen</h3>
        <p className="text-gray-500 text-sm">Keine Warnungen</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="mb-3 font-medium text-gray-400 text-sm">Letzte Warnungen ({warnungen.length})</h3>
      <div className="max-h-64 space-y-2 overflow-y-auto" role="log" aria-live="polite" aria-label="System-Warnungen">
        {(() => {
          const warnungKeyCounts = new Map<string, number>();

          return warnungen.map((w) => {
            const warnungKeyBase = getWarnungKeyBase(w);
            const occurrence = (warnungKeyCounts.get(warnungKeyBase) ?? 0) + 1;
            warnungKeyCounts.set(warnungKeyBase, occurrence);

            return (
              <div key={`${warnungKeyBase}|${occurrence}`} className="flex items-center justify-between rounded bg-gray-900/50 px-3 py-2 text-sm">
                <span className={WARNUNG_TYP_COLORS[w.warnungTyp] || 'text-gray-300'}>{WARNUNG_TYP_LABELS[w.warnungTyp] || w.warnungTyp}</span>
                <span className="text-gray-500">{new Date(w.timestamp).toLocaleTimeString('de-DE')}</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
