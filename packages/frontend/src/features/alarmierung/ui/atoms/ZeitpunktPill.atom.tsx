/**
 * ZeitpunktPill
 *
 * Einzelner Zeitstempel mit Quelle-Icon. Zeigt die Uhrzeit `HH:mm` (lokal)
 * und markiert durch ein Icon, ob der Wert via FMS-Statusmeldung oder
 * manuell gesetzt wurde.
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import { PiClock, PiPencilSimple, PiRadio } from 'react-icons/pi';

export type ZeitpunktQuelle = 'fms' | 'manuell' | 'leer';

export interface ZeitpunktPillProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Der Zeitpunkt-Wert (ISO-String oder Date). `null/undefined` → „leer". */
  wert?: Date | string | null;
  quelle?: ZeitpunktQuelle;
  /** Feld-Label, z. B. „Ausgerückt". Wird in aria-label verwendet. */
  label?: string;
}

function formatTime(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return '--:--';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export function ZeitpunktPill({ wert, quelle, label, className, ...rest }: ZeitpunktPillProps) {
  const hasValue = wert !== null && wert !== undefined;
  const effectiveQuelle: ZeitpunktQuelle = hasValue ? (quelle ?? 'manuell') : 'leer';
  const Icon = effectiveQuelle === 'fms' ? PiRadio : effectiveQuelle === 'manuell' ? PiPencilSimple : PiClock;
  const quelleLabel = effectiveQuelle === 'fms' ? 'via FMS' : effectiveQuelle === 'manuell' ? 'manuell erfasst' : 'nicht gesetzt';
  const time = formatTime(wert);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-xs tabular-nums',
        hasValue
          ? 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
          : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500',
        className,
      )}
      aria-label={label ? `${label} ${time} (${quelleLabel})` : `${time} (${quelleLabel})`}
      data-quelle={effectiveQuelle}
      {...rest}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{time}</span>
    </span>
  );
}
