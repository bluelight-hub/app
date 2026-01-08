import { cn } from '@/shared/ui/cn';

type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';

interface InviteStatusBadgeProps {
  /** Invite-Code Status */
  status: InviteStatus;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

const STATUS_STYLES: Record<InviteStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  used: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  expired: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const STATUS_LABELS: Record<InviteStatus, string> = {
  active: 'Aktiv',
  used: 'Verwendet',
  expired: 'Abgelaufen',
  revoked: 'Widerrufen',
};

/**
 * Badge für Invite-Code Status Anzeige.
 *
 * Zeigt den Status eines Invite-Codes mit farbcodiertem Hintergrund.
 * Unterstützt 4 Status-Varianten: active (grün), used (grau), expired (amber), revoked (rot).
 *
 * @example
 * ```tsx
 * <InviteStatusBadge status="active" />
 * // Zeigt: "Aktiv" mit grünem Hintergrund
 *
 * <InviteStatusBadge status="expired" />
 * // Zeigt: "Abgelaufen" mit amber Hintergrund
 * ```
 */
export function InviteStatusBadge({ status, className }: InviteStatusBadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs', STATUS_STYLES[status], className)}>{STATUS_LABELS[status]}</span>;
}
