/**
 * ServerColorPicker Molecule
 *
 * Ermöglicht die Auswahl einer Server-Farbe aus vordefinierten Presets.
 * Unterstützt Keyboard-Navigation und ist vollständig accessible.
 *
 * @module features/server/ui/molecules/ServerColorPicker
 */

import { useCallback, useRef, type KeyboardEvent, type AriaAttributes } from 'react';
import { PiCheck, PiX } from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/ui/cn';
import { SERVER_COLOR_PRESETS, getServerColorClass, type ServerColorValue } from '../../utils/server-color.utils';

/**
 * Props für die ServerColorPicker Komponente.
 */
export interface ServerColorPickerProps {
  /** Aktuell gewählte Farbe (undefined = keine Auswahl) */
  value?: string;
  /** Callback bei Farbänderung */
  onChange: (color: string | undefined) => void;
  /** Deaktiviert die Komponente */
  disabled?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
  /** Accessibility-Label für die Radiogroup */
  'aria-label'?: AriaAttributes['aria-label'];
}

/** Anzahl der Spalten im Grid */
const GRID_COLUMNS = 5;

/**
 * ServerColorPicker - Farb-Auswahl für Server-Konfigurationen
 *
 * Zeigt ein 3-Spalten-Grid mit Farboptionen an. Unterstützt:
 * - Keyboard-Navigation (Pfeiltasten, Enter, Space)
 * - ARIA-konforme Accessibility (radiogroup)
 * - Optional "Keine Farbe" Reset-Option
 *
 * @example
 * ```tsx
 * <ServerColorPicker
 *   value={selectedColor}
 *   onChange={(color) => setSelectedColor(color)}
 * />
 * ```
 */
export function ServerColorPicker({ value, onChange, disabled = false, className, 'aria-label': ariaLabel = 'Farbe auswählen' }: ServerColorPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prüft ob der aktuelle Wert eine gültige Farbe aus den Presets ist
  const isValidPresetColor = SERVER_COLOR_PRESETS.some((p) => p.value === value);
  const hasValue = value !== undefined && isValidPresetColor;

  // Bestimmt welches Item den Fokus-TabIndex haben soll
  const getFocusableIndex = useCallback(() => {
    if (!hasValue) return 0;
    const selectedIndex = SERVER_COLOR_PRESETS.findIndex((p) => p.value === value);
    return selectedIndex >= 0 ? selectedIndex : 0;
  }, [hasValue, value]);

  /**
   * Behandelt Klick auf eine Farboption.
   */
  const handleColorClick = useCallback(
    (colorValue: string | undefined) => {
      if (disabled) return;
      // Keine Aktion wenn bereits ausgewählt
      if (colorValue === value) return;
      onChange(colorValue);
    },
    [disabled, onChange, value],
  );

  /**
   * Behandelt Keyboard-Events für Navigation und Auswahl.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number, colorValue: string | undefined) => {
      if (disabled) return;

      const totalItems = SERVER_COLOR_PRESETS.length;

      // Auswahl mit Enter oder Space
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (colorValue !== value) {
          onChange(colorValue);
        }
        return;
      }

      // Navigation mit Pfeiltasten
      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          nextIndex = (index + 1) % totalItems;
          break;
        case 'ArrowLeft':
          event.preventDefault();
          nextIndex = index === 0 ? totalItems - 1 : index - 1;
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Move down one row - bei letzter Zeile am aktuellen Item bleiben (konsistent mit ArrowUp)
          nextIndex = index + GRID_COLUMNS;
          if (nextIndex >= totalItems) {
            // Bleib am aktuellen Item wenn wir über das Ende hinaus gehen würden
            nextIndex = index;
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Move up one row - bei erster Zeile am aktuellen Item bleiben
          nextIndex = index - GRID_COLUMNS;
          if (nextIndex < 0) {
            // Bleib am aktuellen Item wenn wir über den Anfang hinaus gehen würden
            nextIndex = index;
          }
          break;
        default:
          return;
      }

      // Fokussiere das nächste Element
      const container = containerRef.current;
      if (container) {
        const buttons = container.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons[nextIndex]?.focus();
      }
    },
    [disabled, onChange, value],
  );

  const focusableIndex = getFocusableIndex();

  return (
    <div className={cn('flex flex-col items-start gap-2', disabled && 'cursor-not-allowed opacity-50', className)}>
      <div ref={containerRef} role="radiogroup" aria-label={ariaLabel} className="grid w-fit grid-cols-5 gap-2">
        {SERVER_COLOR_PRESETS.map((preset, index) => {
          const isSelected = preset.value === value;
          const isFocusable = index === focusableIndex;

          return (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              size="icon-lg"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={disabled}
              aria-label={preset.name}
              // L1 Fix: Native Tooltip für Farbname bei Hover
              title={preset.name}
              tabIndex={disabled ? -1 : isFocusable ? 0 : -1}
              disabled={disabled}
              onClick={() => handleColorClick(preset.value as ServerColorValue)}
              onKeyDown={(e) => handleKeyDown(e, index, preset.value as ServerColorValue)}
              className={cn(
                '!rounded-xl size-9 border-slate-200/80 bg-white/90 p-1 text-white shadow-sm transition-all hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:border-slate-700 dark:hover:bg-slate-950',
                'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2',
                isSelected && 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/25 ring-offset-2 dark:border-sky-400 dark:bg-sky-950/30 dark:text-sky-100 dark:ring-sky-400/30',
              )}
            >
              <span className={cn('relative flex size-full items-center justify-center rounded-[0.8rem] shadow-inner', getServerColorClass(preset.value, 'bg'))}>
                {isSelected && <PiCheck className="size-3 drop-shadow-sm" />}
              </span>
            </Button>
          );
        })}
      </div>

      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => handleColorClick(undefined)}
          aria-label="Farbe zurücksetzen"
          title="Farbe zurücksetzen"
          className="!rounded-md h-7 px-2 text-slate-500 text-xs hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <PiX className="size-4" />
          Zurücksetzen
        </Button>
      )}
    </div>
  );
}
