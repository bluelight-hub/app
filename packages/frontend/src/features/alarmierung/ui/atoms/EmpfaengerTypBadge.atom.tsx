/**
 * EmpfaengerTypBadge
 *
 * Badge für den Typ eines Alarmierungs-Empfängers (Fahrzeug / Person / Einheit).
 */

import { cn } from '@/shared/ui/cn';
import type { ComponentProps } from 'react';
import { PiPerson, PiTruck, PiUsersThree } from 'react-icons/pi';
import type { EmpfaengerKind } from '../../schemas/alarmierung.schema';

export interface EmpfaengerTypBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  kind: EmpfaengerKind;
  size?: 'sm' | 'md';
  iconOnly?: boolean;
}

const STYLES: Record<EmpfaengerKind, { label: string; color: string }> = {
  fahrzeug: { label: 'Fahrzeug', color: 'text-blue-700 bg-blue-50 border-blue-300 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700' },
  person: { label: 'Person', color: 'text-purple-700 bg-purple-50 border-purple-300 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-700' },
  einheit: { label: 'Einheit', color: 'text-cyan-700 bg-cyan-50 border-cyan-300 dark:text-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700' },
};

const ICONS: Record<EmpfaengerKind, typeof PiTruck> = {
  fahrzeug: PiTruck,
  person: PiPerson,
  einheit: PiUsersThree,
};

export function EmpfaengerTypBadge({ kind, size = 'md', iconOnly = false, className, ...rest }: EmpfaengerTypBadgeProps) {
  const style = STYLES[kind];
  const Icon = ICONS[kind];
  const sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-xs px-2 py-1 gap-1.5';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn('inline-flex items-center rounded-full border font-medium', sizeClasses, style.color, className)}
      role="status"
      aria-label={`Empfänger-Typ: ${style.label}`}
      data-kind={kind}
      {...rest}
    >
      <Icon className={iconSize} aria-hidden="true" />
      {!iconOnly && <span>{style.label}</span>}
    </span>
  );
}
