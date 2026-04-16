/**
 * AlarmierungStatusBadge
 *
 * Darstellung des Alarmierungs-Status (aktiv / abgeschlossen) als Chip.
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';

export type AlarmierungStatus = 'aktiv' | 'abgeschlossen';

export interface AlarmierungStatusBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  status: AlarmierungStatus;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<AlarmierungStatus, { text: string; bg: string; border: string; label: string }> = {
  aktiv: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-500 dark:border-emerald-500',
    label: 'Aktiv',
  },
  abgeschlossen: {
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    border: 'border-slate-300 dark:border-slate-600',
    label: 'Abgeschlossen',
  },
};

export function AlarmierungStatusBadge({ status, size = 'md', className, ...rest }: AlarmierungStatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={cn('inline-flex items-center rounded-full border font-medium', sizeClasses, style.text, style.border, style.bg, className)}
      role="status"
      aria-label={`Alarmierungs-Status: ${style.label}`}
      data-status={status}
      {...rest}
    >
      {style.label}
    </span>
  );
}
