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
  ZUSTELLRATE: 'text-status-danger-text',
  OUTBOX_STAU: 'text-status-warning-text',
  LATENZ: 'text-status-warning-text',
  CIRCUIT_BREAKER: 'text-status-danger-text',
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
      <div className="rounded-panel border border-border-subtle bg-surface-raised p-4">
        <h3 className="mb-2 font-medium text-text-secondary text-sm">Letzte Warnungen</h3>
        <p className="text-text-muted text-sm">Keine Warnungen</p>
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-raised p-4">
      <h3 className="mb-3 font-medium text-text-secondary text-sm">Letzte Warnungen ({warnungen.length})</h3>
      <div className="max-h-64 space-y-2 overflow-y-auto" role="log" aria-live="polite" aria-label="System-Warnungen">
        {(() => {
          const warnungKeyCounts = new Map<string, number>();

          return warnungen.map((w) => {
            const warnungKeyBase = getWarnungKeyBase(w);
            const occurrence = (warnungKeyCounts.get(warnungKeyBase) ?? 0) + 1;
            warnungKeyCounts.set(warnungKeyBase, occurrence);

            return (
              <div key={`${warnungKeyBase}|${occurrence}`} className="flex items-center justify-between rounded-control bg-surface-canvas px-3 py-2 text-sm">
                <span className={WARNUNG_TYP_COLORS[w.warnungTyp] || 'text-text-secondary'}>{WARNUNG_TYP_LABELS[w.warnungTyp] || w.warnungTyp}</span>
                <span className="text-text-muted">{new Date(w.timestamp).toLocaleTimeString('de-DE')}</span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
