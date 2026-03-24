import { cn } from '@/shared/ui/cn';
import { PiX } from 'react-icons/pi';

export interface FilterChipProps {
  label: string;
  /** Tailwind-Klasse für Badge-Farben, z.B. `bg-status-info-surface border-status-info-border text-status-info-text` */
  colorClass?: string;
  /** Hex-Code für Kategorie-Farbe (überschreibt colorClass) */
  kategorieColor?: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, colorClass = 'bg-surface-raised border-border-subtle text-text-secondary', kategorieColor, onRemove, className }: FilterChipProps) {
  const colorStyle = kategorieColor ? { backgroundColor: `${kategorieColor}20`, borderColor: kategorieColor } : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium text-xs',
        'transition-colors duration-150',
        !kategorieColor && colorClass,
        kategorieColor && 'text-text-primary',
        className,
      )}
      style={colorStyle}
    >
      {kategorieColor && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: kategorieColor }} aria-hidden="true" />}
      <span className="max-w-[120px] truncate" title={label}>
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full',
          'text-current opacity-60 hover:bg-surface-inverse/10 hover:opacity-100',
          'focus:outline-none focus-visible:shadow-focus-ring',
        )}
        aria-label={`Filter "${label}" entfernen`}
      >
        <PiX className="h-3 w-3" />
      </button>
    </span>
  );
}
