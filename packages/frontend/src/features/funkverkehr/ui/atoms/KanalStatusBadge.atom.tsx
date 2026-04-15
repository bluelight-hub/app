/**
 * KanalStatusBadge
 *
 * Darstellung des Kanalstatus (aktiv / inaktiv / archiviert).
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';

export type KanalStatus = FunkkanalResponseDto['status'];

export interface KanalStatusBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  status: KanalStatus;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<KanalStatus, { text: string; bg: string; border: string; label: string }> = {
  aktiv: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    border: 'border-emerald-500 dark:border-emerald-500',
    label: 'Aktiv',
  },
  inaktiv: {
    text: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    border: 'border-slate-300 dark:border-slate-600',
    label: 'Inaktiv',
  },
  archiviert: {
    text: 'text-zinc-500 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-900/50',
    border: 'border-dashed border-zinc-400 dark:border-zinc-600',
    label: 'Archiviert',
  },
};

export function KanalStatusBadge({ status, size = 'md', className, ...rest }: KanalStatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span
      className={cn('inline-flex items-center rounded-full border font-medium', sizeClasses, style.text, style.border, style.bg, className)}
      role="status"
      aria-label={`Kanalstatus: ${style.label}`}
      data-status={status}
      {...rest}
    >
      {style.label}
    </span>
  );
}
