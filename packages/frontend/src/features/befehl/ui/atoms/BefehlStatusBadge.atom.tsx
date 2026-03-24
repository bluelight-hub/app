import { Badge } from '@/shared/ui/atoms/badge.atom';
import type { BadgeVariant } from '@/shared/ui/atoms/badge.atom';
import { cn } from '@/shared/ui/cn';

/** Befehl-Status aus dem generierten API Client */
type BefehlStatus = 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT';

interface BefehlStatusBadgeProps {
  status: BefehlStatus;
  className?: string;
}

const STATUS_CONFIG: Record<BefehlStatus, { variant: BadgeVariant; label: string; className?: string }> = {
  ERTEILT: { variant: 'default', label: 'Erteilt' },
  ZUGESTELLT: { variant: 'info', label: 'Zugestellt' },
  QUITTIERT: { variant: 'success', label: 'Quittiert' },
  KORRIGIERT: { variant: 'warning', label: 'Korrigiert', className: 'bg-status-warning-surface text-status-warning-text' },
};

/**
 * Status-Badge für Befehle mit Ampel-Farben.
 *
 * Zeigt immer Text-Label (nicht nur Farbe) für WCAG 2.1 AA Konformität.
 */
export function BefehlStatusBadge({ status, className }: BefehlStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { variant: 'default' as BadgeVariant, label: status };

  return (
    <Badge variant={config.variant} size="sm" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
