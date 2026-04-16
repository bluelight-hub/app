/**
 * NachalarmierungBadge
 *
 * Markiert eine Alarmierung als Nachalarmierung und zeigt optional den
 * Bezug zur Ursprungs-Alarmierung als verlinkten Text an.
 */

import { cn } from '@/shared/ui/cn';
import type { ButtonHTMLAttributes } from 'react';
import { PiArrowUUpRight } from 'react-icons/pi';

export interface NachalarmierungBadgeProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Bezeichnung der Ursprungs-Alarmierung für den Tooltip / Link-Text. */
  ursprungBezeichnung?: string;
  size?: 'sm' | 'md';
}

export function NachalarmierungBadge({ ursprungBezeichnung, size = 'md', className, onClick, ...rest }: NachalarmierungBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const label = ursprungBezeichnung ? `Nachalarmierung von „${ursprungBezeichnung}"` : 'Nachalarmierung';
  const isInteractive = Boolean(onClick);

  const baseClasses = cn(
    'inline-flex items-center rounded-full border font-medium',
    'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200',
    sizeClasses,
    isInteractive && 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/50',
    className,
  );

  if (isInteractive) {
    return (
      <button type="button" className={baseClasses} onClick={onClick} aria-label={label} {...rest}>
        <PiArrowUUpRight className={iconSize} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <span className={baseClasses} role="status" aria-label={label} {...rest}>
      <PiArrowUUpRight className={iconSize} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
