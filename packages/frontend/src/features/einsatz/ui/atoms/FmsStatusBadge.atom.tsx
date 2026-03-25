import { cn } from '@/shared/ui/cn';
import { FMS_STATUS_LABELS, getStatusClasses, type FmsStatus } from '../../constants/fms-status.constants';

interface FmsStatusBadgeProps {
  /** FMS-Status Code (1-9) */
  status: FmsStatus;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Badge für FMS-Status Anzeige.
 *
 * Zeigt FMS-Status mit farbcodiertem Hintergrund gemäß Story 4.3.
 *
 * @example
 * ```tsx
 * <FmsStatusBadge status={2} />
 * // Zeigt: "FMS 2" mit grünem Hintergrund
 * ```
 */
export function FmsStatusBadge({ status, className }: FmsStatusBadgeProps) {
  const colorClasses = getStatusClasses(status);

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colorClasses, className)} title={FMS_STATUS_LABELS[status]}>
      FMS {status}
    </span>
  );
}
