import { Badge } from '@/components/atoms/badge.atom';
import type { BadgeVariant } from '@/components/atoms/badge.atom';

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
  const statusConfig: Record<string, { variant: BadgeVariant; label: string; dotColor?: 'green' | 'red' | 'yellow' | 'blue' }> = {
    [EinsatzStatus.ANGELEGT]: {
      variant: 'info',
      label: 'Angelegt',
      dotColor: 'blue',
    },
    [EinsatzStatus.IN_BEARBEITUNG]: {
      variant: 'warning',
      label: 'In Bearbeitung',
      dotColor: 'yellow',
    },
    [EinsatzStatus.ABGESCHLOSSEN]: {
      variant: 'success',
      label: 'Abgeschlossen',
      dotColor: 'green',
    },
    [EinsatzStatus.ARCHIVIERT]: {
      variant: 'default',
      label: 'Archiviert',
      dotColor: 'blue',
    },
  };

  const config = statusConfig[status] || {
    variant: 'default' as BadgeVariant,
    label: status,
    dotColor: 'blue' as const,
  };

  return (
    <Badge variant={config.variant} size={size} dot={showDot} dotColor={config.dotColor} className={className}>
      {config.label}
    </Badge>
  );
}
