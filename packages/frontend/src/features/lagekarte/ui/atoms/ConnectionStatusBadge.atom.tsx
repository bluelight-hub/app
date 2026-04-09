/**
 * ConnectionStatusBadge
 *
 * Zeigt den WebSocket-Verbindungsstatus als dezentes Badge an.
 * Verwendet Tailwind-only Styling mit pulsierendem Punkt für "connecting".
 */

import type * as React from 'react';
import { cn } from '@/shared/ui/cn';

interface ConnectionStatusBadgeProps {
  /** Aktueller Verbindungsstatus */
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  /** Optionale CSS-Klassen */
  className?: string;
}

/** Konfiguration pro Status: Punkt-Farbe, Puls-Animation und Label */
const STATUS_CONFIG = {
  connected: {
    dotClass: 'bg-green-500',
    pulse: false,
    label: 'Verbunden',
  },
  connecting: {
    dotClass: 'bg-yellow-500',
    pulse: true,
    label: 'Verbinde\u2026',
  },
  disconnected: {
    dotClass: 'bg-red-500',
    pulse: false,
    label: 'Offline',
  },
  error: {
    dotClass: 'bg-red-500',
    pulse: false,
    label: 'Verbindungsfehler',
  },
} as const;

/**
 * Badge-Komponente für den WebSocket-Verbindungsstatus.
 * Klein und dezent, Positionierung erfolgt im Parent.
 */
export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full text-xs backdrop-blur-sm transition-all',
        status === 'connected' ? 'bg-transparent px-1 py-1' : 'border border-border-subtle bg-surface-panel/90 px-2.5 py-1 text-text-muted shadow-sm',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={`WebSocket-Status: ${config.label}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.dotClass)} />}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dotClass)} />
      </span>
      {status !== 'connected' && <span>{config.label}</span>}
    </div>
  );
};
