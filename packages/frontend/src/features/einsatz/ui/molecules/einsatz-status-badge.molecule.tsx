import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/atoms/badge.atom';
import type { BadgeVariant } from '@/shared/ui/atoms/badge.atom';

export enum EinsatzStatus {
  ANGELEGT = 'ANGELEGT',
  IN_BEARBEITUNG = 'IN_BEARBEITUNG',
  ABGESCHLOSSEN = 'ABGESCHLOSSEN',
  ARCHIVIERT = 'ARCHIVIERT',
}

interface EinsatzStatusBadgeProps {
  status: EinsatzStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

/**
 * EinsatzStatusBadge-Komponente für Einsatz-Status-Anzeigen
 *
 * Wrapper um die Badge-Komponente mit spezifischen Farben für EinsatzStatus.
 */
export function EinsatzStatusBadge({ status, size = 'md', showDot = false, className }: EinsatzStatusBadgeProps) {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string; className: string; dotColor?: 'green' | 'red' | 'yellow' | 'blue' }> = {
    [EinsatzStatus.ANGELEGT]: {
      variant: 'info',
      label: 'Angelegt',
      className: 'border border-status-info-border bg-status-info-surface text-status-info-text',
      dotColor: 'blue',
    },
    [EinsatzStatus.IN_BEARBEITUNG]: {
      variant: 'warning',
      label: 'In Bearbeitung',
      className: 'border border-status-warning-border bg-status-warning-surface text-status-warning-text',
      dotColor: 'yellow',
    },
    [EinsatzStatus.ABGESCHLOSSEN]: {
      variant: 'success',
      label: 'Abgeschlossen',
      className: 'border border-status-success-border bg-status-success-surface text-status-success-text',
      dotColor: 'green',
    },
    [EinsatzStatus.ARCHIVIERT]: {
      variant: 'default',
      label: 'Archiviert',
      className: 'border border-border-subtle bg-surface-raised text-text-secondary',
      dotColor: 'blue',
    },
  };

  const config = statusConfig[status] || {
    variant: 'default' as BadgeVariant,
    label: status,
    className: 'border border-border-subtle bg-surface-raised text-text-secondary',
    dotColor: 'blue' as const,
  };

  return (
    <Badge variant={config.variant} size={size} dot={showDot} dotColor={config.dotColor} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
