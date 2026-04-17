import { PiMapPin } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

export interface ZoneCountBadgeProps {
  count: number;
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Zeigt in einer Matrix-Zelle, wie viele Gefahrenzonen räumlich verortet sind,
 * und navigiert per Klick zur Lagekarte mit entsprechendem Fokus. Keine
 * Darstellung bei `count === 0`.
 */
export function ZoneCountBadge({ count, onClick, className, 'aria-label': ariaLabel }: ZoneCountBadgeProps) {
  if (count === 0) {
    return null;
  }

  const label = ariaLabel ?? `${count} ${count === 1 ? 'Zone' : 'Zonen'} räumlich verortet. Öffnet Lagekarte.`;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-1 py-0 text-[10px] leading-tight font-semibold',
        'border-border-subtle bg-surface-panel text-action-primary',
        'hover:border-action-primary focus:outline-none focus-visible:shadow-focus',
        className,
      )}
      data-zone-count-badge
    >
      <PiMapPin className="size-2.5" aria-hidden />
      {count}
    </button>
  );
}
