import { cn } from '@/shared/ui/cn';
import { memo } from 'react';
import { PiCheckCircle, PiLock, PiArchive, PiProhibit } from 'react-icons/pi';

type EntityStatus = 'aktiv' | 'gesperrt' | 'archiviert' | 'inaktiv';

interface EntityStatusBadgeProps {
  status: EntityStatus;
  reason?: string | null;
  className?: string;
}

const STATUS_CONFIG = {
  aktiv: {
    label: 'Aktiv',
    icon: PiCheckCircle,
    classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  gesperrt: {
    label: 'Gesperrt',
    icon: PiLock,
    classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  archiviert: {
    label: 'Archiviert',
    icon: PiArchive,
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  inaktiv: {
    label: 'Inaktiv',
    icon: PiProhibit,
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
} as const;

/**
 * Einheitlicher Status-Badge fuer alle Entitaeten im Admin-Bereich.
 *
 * Story 5.2 AC2: Nicht nur Farbe sondern auch Text + Icon (WCAG 2.1 AA).
 * aria-label mit vollstaendigem Status-Text.
 */
export const EntityStatusBadge = memo(({ status, reason, className }: EntityStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const ariaLabel = reason ? `${config.label}: ${reason}` : config.label;

  return (
    <span role="status" aria-label={ariaLabel} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs', config.classes, className)} title={reason ?? undefined}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
      {reason && <span className="sr-only">: {reason}</span>}
    </span>
  );
});

EntityStatusBadge.displayName = 'EntityStatusBadge';
