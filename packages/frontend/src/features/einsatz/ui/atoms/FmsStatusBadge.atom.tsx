import { FMS_STATUS_LABELS, getStatusClasses, type FmsStatus } from '../../constants/fms-status.constants';

interface FmsStatusBadgeProps {
  /** FMS-Status Code (0-9) */
  status: FmsStatus;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /**
   * Zeigt nur die Nummer ohne Label.
   * - `false` (default): Zeigt "2 - Einsatzbereit"
   * - `true`: Zeigt nur "2"
   */
  compact?: boolean;
}

/**
 * Badge für FMS-Status Anzeige.
 *
 * Zeigt Status-Code mit farbcodiertem Hintergrund.
 * Unterstützt Light und Dark Mode.
 *
 * @example
 * ```tsx
 * <FmsStatusBadge status={2} />
 * // Zeigt: "2 - Einsatzbereit" mit grünem Hintergrund
 * ```
 */
export function FmsStatusBadge({ status, className = '', compact = false }: FmsStatusBadgeProps) {
  const label = FMS_STATUS_LABELS[status] ?? `Status ${status}`;
  const colorClasses = getStatusClasses(status);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${colorClasses} ${className}`} title={`FMS-Status: ${label}`}>
      {compact ? status : `${status} - ${label}`}
    </span>
  );
}
