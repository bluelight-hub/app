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
            'h-8 w-8 rounded-full border-2 transition-all focus:outline-none focus-visible:shadow-focus-ring',
            value === preset.hex ? 'border-action-primary ring-2 ring-action-primary/40 ring-offset-2 ring-offset-surface-panel' : 'border-border-subtle hover:border-border-strong',
          )}
          style={{ backgroundColor: preset.hex }}
          onClick={() => onChange(preset.hex)}
        />
      ))}
    </div>
  );
}
