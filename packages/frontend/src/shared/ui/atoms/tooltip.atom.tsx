/**
 * Tooltip Atom
 *
 * Barrierefreier Tooltip als Ersatz fuer HTML `title` Attribute.
 * Unterstuetzt Keyboard-Navigation (fokussierbar, zeigt bei focus)
 * und Screen-Reader (aria-describedby).
 *
 * Nutzt ausschliesslich Tailwind CSS fuer Styling (group/tooltip Pattern).
 */

import { cn } from '@/shared/ui/cn';
import { type ReactNode, useId } from 'react';

interface TooltipProps {
  /** Tooltip-Text der angezeigt wird */
  content: string;
  /** Das Element das den Tooltip ausloest */
  children: ReactNode;
  /** Zusaetzliche CSS-Klassen fuer den aeusseren Container */
  className?: string;
  /** Position des Tooltips relativ zum Trigger-Element */
  position?: 'top' | 'bottom';
}

/**
 * Barrierefreier Tooltip (WCAG 2.1 konform).
 *
 * Zeigt bei Hover und Focus einen Tooltip-Text an.
 * Das Tooltip-Element traegt `role="tooltip"` und wird per `aria-describedby`
 * vom umgebenden Container referenziert.
 *
 * Fuer disabled Buttons: den Button in ein `<Tooltip>` wrappen, damit
 * der aeussere Container fokussierbar bleibt (disabled Buttons erhalten keinen Focus).
 *
 * @example
 * ```tsx
 * <Tooltip content="Nur Befehlsgeber duerfen exportieren">
 *   <button disabled>Export</button>
 * </Tooltip>
 * ```
 */
export function Tooltip({ content, children, className, position = 'top' }: TooltipProps) {
  const tooltipId = useId();

  return (
    <span className={cn('group/tooltip relative inline-flex', className)} aria-describedby={tooltipId}>
      {children}
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          // Basis-Styling
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap',
          'rounded-control bg-surface-inverse px-2 py-1 font-medium text-text-inverse text-xs shadow-md',
          // Sichtbarkeit: versteckt, bei group-hover/focus-within sichtbar
          'invisible opacity-0 transition-opacity',
          'group-hover/tooltip:visible group-hover/tooltip:opacity-100',
          'group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100',
          // Positionierung
          position === 'top' && 'bottom-full mb-2',
          position === 'bottom' && 'top-full mt-2',
        )}
      >
        {content}
        {/* Pfeil */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-4 border-transparent',
            position === 'top' && 'top-full border-t-surface-inverse',
            position === 'bottom' && 'bottom-full border-b-surface-inverse',
          )}
        />
      </span>
    </span>
  );
}
