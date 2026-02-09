import { cn } from '@/shared/ui/cn';
import { PiX } from 'react-icons/pi';

export interface FilterChipProps {
  label: string;
  /** Tailwind color class for background/border (z.B. 'bg-indigo-100 border-indigo-300') */
  colorClass?: string;
  /** Hex-Code für Kategorie-Farbe (überschreibt colorClass) */
  kategorieColor?: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, colorClass = 'bg-gray-100 border-gray-300 text-gray-700', kategorieColor, onRemove, className }: FilterChipProps) {
  const colorStyle = kategorieColor ? { backgroundColor: `${kategorieColor}20`, borderColor: kategorieColor } : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium text-xs',
        'transition-colors duration-150',
        !kategorieColor && colorClass,
        kategorieColor && 'text-gray-900 dark:text-gray-100',
        'dark:border-opacity-50 dark:bg-opacity-20',
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
          'text-current opacity-60 hover:bg-black/10 hover:opacity-100',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          'dark:hover:bg-white/20',
        )}
        aria-label={`Filter "${label}" entfernen`}
      >
        <PiX className="h-3 w-3" />
      </button>
    </span>
  );
}
