import { cn } from '@/shared/ui/cn';

interface InactivityBadgeProps {
  /**
   * Zeigt das Badge nur an wenn true
   */
  isInactive: boolean;
  /**
   * Optionaler Tooltip-Text
   */
  tooltip?: string;
  /**
   * Optionale zusaetzliche CSS-Klassen
   */
  className?: string;
}

/**
 * InactivityBadge Atom
 *
 * Zeigt einen Warnhinweis fuer inaktive Tokens an.
 * Wird nur gerendert wenn isInactive=true ist.
 *
 * Ein Token gilt als inaktiv wenn es seit mehr als 90 Tagen
 * nicht verwendet wurde oder noch nie verwendet wurde.
 *
 * @example
 * ```tsx
 * <InactivityBadge isInactive={true} />
 * <InactivityBadge isInactive={false} /> // rendert nichts
 * <InactivityBadge isInactive={true} tooltip="Seit 120 Tagen nicht verwendet" />
 * ```
 */
export function InactivityBadge({ isInactive, tooltip, className }: InactivityBadgeProps) {
  if (!isInactive) {
    return null;
  }

  const defaultTooltip = 'Dieser Token wurde seit ueber 90 Tagen nicht verwendet';

  return (
    // biome-ignore lint/a11y/useSemanticElements: span with role="status" is intentional for inline badge styling
    <span
      className={cn('inline-flex items-center rounded-control px-2 py-0.5 font-medium text-xs', 'bg-status-warning-surface text-status-warning-text', className)}
      role="status"
      aria-label={tooltip ?? defaultTooltip}
      title={tooltip ?? defaultTooltip}
    >
      Inaktiv
    </span>
  );
}
