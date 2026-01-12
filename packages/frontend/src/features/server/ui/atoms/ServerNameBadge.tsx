/**
 * ServerNameBadge Atom
 *
 * Zeigt den Namen des aktuell aktiven Servers im Header an.
 * Read-only Anzeige ohne Interaktionsmöglichkeit (kein Server-Wechsel).
 *
 * @module features/server/ui/atoms/ServerNameBadge
 */

import { cn } from '@/shared/ui/cn';
import { PiCloudArrowUp } from 'react-icons/pi';

/**
 * Vordefinierte Größen-Klassen für die maximale Breite des Server-Namens.
 */
const sizeClasses = {
  sm: 'max-w-[100px]',
  md: 'max-w-[150px]',
  lg: 'max-w-[200px]',
} as const;

/**
 * Props für die ServerNameBadge Komponente.
 */
export interface ServerNameBadgeProps {
  /**
   * Name des Servers, der angezeigt werden soll.
   */
  name: string;
  /**
   * Maximale Breite des Badges als vordefinierte Größe.
   * - sm: 100px
   * - md: 150px (Standard)
   * - lg: 200px
   */
  size?: keyof typeof sizeClasses;
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * ServerNameBadge Komponente
 *
 * Zeigt den aktuellen Server-Namen als subtiles Badge im Header an.
 * Verwendet ein Server-Icon und truncated lange Namen.
 *
 * @example
 * ```tsx
 * <ServerNameBadge name="Produktions-Server" />
 * <ServerNameBadge name="Sehr langer Server-Name hier" size="lg" />
 * ```
 */
export function ServerNameBadge({ name, size = 'md', className }: ServerNameBadgeProps) {
  return (
    <output className={cn('flex items-center gap-2 text-gray-500 text-sm dark:text-gray-400', className)} title={name} aria-label={`Aktiver Server: ${name}`}>
      <PiCloudArrowUp className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className={cn('truncate', sizeClasses[size])}>{name}</span>
    </output>
  );
}
