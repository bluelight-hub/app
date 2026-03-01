import { cn } from '@/shared/ui/cn';
import { KATEGORIE_FARB_PRESETS } from '../../schemas/kategorie.schema';

interface FarbPresetPickerProps {
  value: string;
  onChange: (farbe: string) => void;
  className?: string;
}

/**
 * Atom: Farbpalette mit 10 vordefinierten Farben als klickbare Kreise (Story 8.1).
 */
export function FarbPresetPicker({ value, onChange, className }: FarbPresetPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup" aria-label="Farbauswahl">
      {KATEGORIE_FARB_PRESETS.map((preset) => (
        <button
          key={preset.hex}
          type="button"
          role="radio"
          aria-checked={value === preset.hex}
          aria-label={preset.name}
          title={preset.name}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition-all',
            value === preset.hex ? 'border-gray-900 ring-2 ring-gray-400 ring-offset-2 dark:border-white dark:ring-gray-500' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
          )}
          style={{ backgroundColor: preset.hex }}
          onClick={() => onChange(preset.hex)}
        />
      ))}
    </div>
  );
}
