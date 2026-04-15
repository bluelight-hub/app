/**
 * NotfallAlertToast
 *
 * Zeigt einen roten, pulsierenden Sonner-Toast für Notfall-Broadcasts.
 * Wird aus `useEinsatzEvents(onNotfall)` aufgerufen.
 */

import { toast } from 'sonner';
import { PiSiren } from 'react-icons/pi';
import type { NotfallAlertPayload } from '../../api/use-einsatz-events';

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export function showNotfallAlertToast(payload: NotfallAlertPayload): void {
  toast.custom(
    () => (
      <div role="alert" className="flex min-w-[22rem] animate-pulse items-start gap-3 rounded border-l-4 border-red-700 bg-red-50 p-3 text-red-900 shadow-lg dark:bg-red-950 dark:text-red-100">
        <PiSiren className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex-1 text-sm leading-tight">
          <div className="font-semibold tracking-wide uppercase">Notfall · {payload.kanalName ?? payload.kanalId}</div>
          <div className="mt-0.5 whitespace-pre-wrap">{payload.text}</div>
          <div className="mt-1 text-xs opacity-70">
            {payload.absender ?? 'Unbekannt'} → {payload.empfaenger ?? '—'} · {formatTime(payload.ereignisZeitpunkt)}
          </div>
        </div>
      </div>
    ),
    { duration: 10_000, id: `notfall:${payload.einsatzId}:${payload.ereignisZeitpunkt}` },
  );
}
