/**
 * FunkPrioritaetBadge
 *
 * Darstellung der Funkspruch-Priorität (Routine / Priorität / Notfall)
 * als Chip. Notfall pulsiert visuell und nutzt ein Sirenen-Icon.
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import { PiBroadcast, PiSiren, PiWarning } from 'react-icons/pi';
import type { FunkPrioritaetFilter } from '../../stores/funkprotokoll-filter.store';
import { PRIORITAET_STYLES } from '../../utils/priority-color';

export interface FunkPrioritaetBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  prioritaet: FunkPrioritaetFilter;
  size?: 'sm' | 'md';
  /** Nur Icon + visueller Status, Label via aria-label */
  iconOnly?: boolean;
}

const ICON_BY_NAME = {
  radio: PiBroadcast,
  warning: PiWarning,
  siren: PiSiren,
} as const;

export function FunkPrioritaetBadge({ prioritaet, size = 'md', iconOnly = false, className, ...rest }: FunkPrioritaetBadgeProps) {
  const style = PRIORITAET_STYLES[prioritaet];
  const Icon = ICON_BY_NAME[style.icon];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'size-3' : 'size-3.5';

  return (
    <span
      className={cn('inline-flex items-center rounded-full border font-medium', sizeClasses, style.text, style.border, style.background, style.pulse && 'animate-pulse', className)}
      role="status"
      aria-label={`Funkpriorität: ${style.label}`}
      data-prioritaet={prioritaet}
      {...rest}
    >
      <Icon className={iconSize} aria-hidden />
      {!iconOnly && <span>{style.label}</span>}
    </span>
  );
}
