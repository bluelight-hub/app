import { Badge } from '@/shared/ui/atoms/badge.atom';
import type { BadgeVariant } from '@/shared/ui/atoms/badge.atom';
import type { EtbDtoStatusEnum } from '@/shared';

/**
 * Status-Typen fuer das ETB
 *
 * Entspricht dem EtbDtoStatusEnum aus dem generierten API-Client.
 */
export type EtbStatus = (typeof EtbDtoStatusEnum)[keyof typeof EtbDtoStatusEnum];

interface EtbStatusBadgeProps {
  /** Aktueller Status des ETB */
  status: EtbStatus;
  /** Groesse des Badges */
  size?: 'sm' | 'md' | 'lg';
  /** Animierter Punkt anzeigen */
  showDot?: boolean;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/**
 * ETB-Status-Badge zur Visualisierung des Einsatztagebuch-Lifecycle-Status
 *
 * Zeigt den aktuellen Status des ETB mit farblicher Kodierung:
 * - DRAFT (Entwurf): Grau - ETB ist noch in Bearbeitung
 * - ACTIVE (Aktiv): Grün - ETB ist aktiv und kann bearbeitet werden
 *
 * Issue #582: LOCKED-Status entfernt — Schreibschutz wird aus Einsatz-Status abgeleitet.
 */
export function EtbStatusBadge({ status, size = 'md', showDot = false, className }: EtbStatusBadgeProps) {
  const statusConfig: Record<
    string,
    {
      variant: BadgeVariant;
      label: string;
      dotColor: 'green' | 'red' | 'yellow' | 'blue';
    }
  > = {
    DRAFT: {
      variant: 'default',
      label: 'Entwurf',
      dotColor: 'blue',
    },
    ACTIVE: {
      variant: 'success',
      label: 'Aktiv',
      dotColor: 'green',
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
