/**
 * ServerStatusDot Atom
 *
 * Zeigt den Verbindungsstatus eines Servers als farbigen Punkt an.
 * Unterstützt sowohl die Story-Terminologie (online/offline) als auch
 * die bestehende Codebase-Terminologie (connected/disconnected).
 *
 * **Farben:**
 * - online/connected: Grün (#10b981 / bg-green-500)
 * - offline/disconnected: Grau (#9ca3af / bg-gray-400)
 * - checking: Gelb mit Pulse-Animation (#eab308 / bg-yellow-500)
 *
 * @module features/server/ui/atoms/ServerStatusDot
 */

import { forwardRef } from 'react';
import { cn } from '@/shared/ui/cn';

/**
 * Mögliche Status-Werte für den ServerStatusDot.
 * Unterstützt beide Terminologien für Kompatibilität.
 */
export type ServerStatus = 'online' | 'offline' | 'checking' | 'connected' | 'disconnected';

/**
 * Props für die ServerStatusDot Komponente.
 */
export interface ServerStatusDotProps {
  /**
   * Der aktuelle Verbindungsstatus des Servers.
   * - online/connected: Server ist erreichbar
   * - offline/disconnected: Server ist nicht erreichbar
   * - checking: Verbindung wird geprüft
   */
  status: ServerStatus;
  /**
   * Größe des Status-Punkts.
   * - sm: h-2 w-2 (8px)
   * - md: h-2.5 w-2.5 (10px) - Standard, passend zu ServerSelector
   * - lg: h-3 w-3 (12px)
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Zusätzliche CSS-Klassen für custom Styling.
   */
  className?: string;
}

/**
 * Normalisiert den Status auf die interne Terminologie.
 * Mappt 'connected' → 'online' und 'disconnected' → 'offline'.
 */
function normalizeStatus(status: ServerStatus): 'online' | 'offline' | 'checking' {
  switch (status) {
    case 'connected':
      return 'online';
    case 'disconnected':
      return 'offline';
    default:
      return status;
  }
}

/**
 * Gibt die Tailwind-Klassen für die Status-Farbe zurück.
 */
function getStatusColorClass(status: 'online' | 'offline' | 'checking'): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'checking':
      return 'bg-yellow-500 animate-pulse';
    case 'offline':
      return 'bg-gray-400';
  }
}

/**
 * Gibt das deutsche ARIA-Label für den Status zurück.
 */
function getStatusAriaLabel(status: 'online' | 'offline' | 'checking'): string {
  switch (status) {
    case 'online':
      return 'Server online';
    case 'checking':
      return 'Serververbindung wird geprüft';
    case 'offline':
      return 'Server offline';
  }
}

/**
 * ServerStatusDot Komponente
 *
 * Visualisiert den Verbindungsstatus eines Servers als farbigen Punkt.
 * Verwendet semantic colors und ARIA-Labels für Accessibility.
 *
 * @example
 * ```tsx
 * // Online Status
 * <ServerStatusDot status="online" />
 *
 * // Mit bestehender Terminologie
 * <ServerStatusDot status="connected" size="lg" />
 *
 * // Checking mit Pulse-Animation
 * <ServerStatusDot status="checking" />
 * ```
 */
export const ServerStatusDot = forwardRef<HTMLSpanElement, ServerStatusDotProps>(({ status, size = 'md', className }, ref) => {
  const normalizedStatus = normalizeStatus(status);
  const colorClass = getStatusColorClass(normalizedStatus);
  const ariaLabel = getStatusAriaLabel(normalizedStatus);

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return <span ref={ref} role="status" aria-label={ariaLabel} className={cn('inline-block flex-shrink-0 rounded-full', sizeClasses[size], colorClass, className)} />;
});

ServerStatusDot.displayName = 'ServerStatusDot';
