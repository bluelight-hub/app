import { cn } from '@/shared/ui/cn';
type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';
interface InviteStatusBadgeProps {
  /** Invite-Code Status */ status: InviteStatus /** Zusätzliche CSS-Klassen */;
  className?: string;
}
const STATUS_STYLES: Record<InviteStatus, string> = {
  active: 'bg-status-success-surface text-status-success-text',
  used: 'bg-surface-raised text-text-secondary',
  expired: 'bg-status-warning-surface text-status-warning-text',
  revoked: 'bg-status-danger-surface text-status-danger-text',
};
const STATUS_LABELS: Record<InviteStatus, string> = {
  active: 'Aktiv',
  used: 'Verwendet',
  expired: 'Abgelaufen',
  revoked: 'Widerrufen',
}; /** * Badge für Invite-Code Status Anzeige. * * Zeigt den Status eines Invite-Codes mit farbcodiertem Hintergrund. * Unterstützt 4 Status-Varianten: active (grün), used (grau), expired (amber), revoked (rot). * * @example * ```tsx * <InviteStatusBadge status="active" /> * // Zeigt: "Aktiv" mit grünem Hintergrund * * <InviteStatusBadge status="expired" /> * // Zeigt: "Abgelaufen" mit amber Hintergrund * ``` */
export function InviteStatusBadge({ status, className }: InviteStatusBadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status], className)}>{STATUS_LABELS[status]}</span>;
}
