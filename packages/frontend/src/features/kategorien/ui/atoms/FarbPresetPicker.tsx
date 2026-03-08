import { cn } from '@/shared/ui/cn';
import { KATEGORIE_FARB_PRESETS } from '@/features/kategorien';

interface FarbPresetPickerProps {
  value: string;
  onChange: (farbe: string) => void;
  className?: string;
  ariaLabelledBy?: string;
}

/**
 * Atom: Farbpalette mit 10 vordefinierten Farben als klickbare Kreise (Story 8.1).
 */
export function FarbPresetPicker({ value, onChange, className, ariaLabelledBy }: FarbPresetPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup" aria-label={ariaLabelledBy ? undefined : 'Farbauswahl'} aria-labelledby={ariaLabelledBy}>
      {KATEGORIE_FARB_PRESETS.map((preset) => (
        // biome-ignore lint/a11y/useSemanticElements: button mit role=radio ist korrekt fuer Farbauswahl-Radiogroup
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
