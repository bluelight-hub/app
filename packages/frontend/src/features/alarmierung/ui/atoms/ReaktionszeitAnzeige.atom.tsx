/**
 * ReaktionszeitAnzeige
 *
 * Farbcodierte Darstellung einer Reaktionszeit (mm:ss).
 * - grün (`schnell`): < 5 min
 * - gelb (`mittel`): < 10 min
 * - rot (`langsam`): >= 10 min
 * - neutral (`pending`): noch kein Vor-Ort-Zeitpunkt
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import { useReaktionszeit, type ReaktionszeitStufe } from '../../hooks/use-reaktionszeit';

export interface ReaktionszeitAnzeigeProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Reaktionszeit in Sekunden, `null` wenn noch nicht vorhanden. */
  sekunden: number | null | undefined;
  size?: 'sm' | 'md';
}

const STUFE_STYLES: Record<ReaktionszeitStufe, { text: string; bg: string; border: string }> = {
  schnell: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-500 dark:border-emerald-500',
  },
  mittel: {
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    border: 'border-amber-500 dark:border-amber-500',
  },
  langsam: {
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-500 dark:border-red-500',
  },
  pending: {
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/60',
    border: 'border-slate-300 dark:border-slate-600',
  },
};

export function ReaktionszeitAnzeige({ sekunden, size = 'md', className, ...rest }: ReaktionszeitAnzeigeProps) {
  const anzeige = useReaktionszeit(sekunden);
  const style = STUFE_STYLES[anzeige.stufe];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={cn('inline-flex items-center rounded border font-mono font-medium tabular-nums', sizeClasses, style.text, style.border, style.bg, className)}
      aria-label={anzeige.ariaLabel}
      data-stufe={anzeige.stufe}
      {...rest}
    >
      {anzeige.label}
    </span>
  );
}
