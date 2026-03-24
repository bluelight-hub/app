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
    classes: 'bg-status-success-surface text-status-success-text',
  },
  gesperrt: {
    label: 'Gesperrt',
    icon: PiLock,
    classes: 'bg-status-danger-surface text-status-danger-text',
  },
  archiviert: {
    label: 'Archiviert',
    icon: PiArchive,
    classes: 'bg-status-warning-surface text-status-warning-text',
  },
  inaktiv: {
    label: 'Inaktiv',
    icon: PiProhibit,
    classes: 'bg-surface-raised text-text-secondary',
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
    <span role="status" aria-label={ariaLabel} className={cn('inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 font-medium text-xs', config.classes, className)} title={reason ?? undefined}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {config.label}
      {reason && <span className="sr-only">: {reason}</span>}
    </span>
  );
});

EntityStatusBadge.displayName = 'EntityStatusBadge';
