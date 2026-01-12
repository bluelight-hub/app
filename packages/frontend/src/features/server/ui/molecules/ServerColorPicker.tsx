/**
 * ServerColorPicker Molecule
 *
 * Ermöglicht die Auswahl einer Server-Farbe aus vordefinierten Presets.
 * Unterstützt Keyboard-Navigation und ist vollständig accessible.
 *
 * @module features/server/ui/molecules/ServerColorPicker
 */

import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/shared/ui/cn';
import { SERVER_COLOR_PRESETS, getServerColorClass, type ServerColorValue } from '../../utils/server-color.utils';

/**
 * L3 Fix: Statische Reset-Option als Konstante definiert,
 * um Array-Mutation bei jedem Render zu vermeiden.
 */
const RESET_OPTION = Object.freeze({ name: 'Keine Farbe', value: undefined as string | undefined, hex: 'transparent' });

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
}

/** Anzahl der Spalten im Grid */
const GRID_COLUMNS = 3;

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
export function ServerColorPicker({ value, onChange, disabled = false, className }: ServerColorPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prüft ob der aktuelle Wert eine gültige Farbe aus den Presets ist
  const isValidPresetColor = SERVER_COLOR_PRESETS.some((p) => p.value === value);
  const hasValue = value !== undefined && isValidPresetColor;

  // L3 Fix: useMemo um Array-Erstellung bei jedem Render zu vermeiden
  const allItems = useMemo(() => (hasValue ? [...SERVER_COLOR_PRESETS, RESET_OPTION] : SERVER_COLOR_PRESETS), [hasValue]);

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

      const totalItems = allItems.length;

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
    [allItems.length, disabled, onChange, value],
  );

  const focusableIndex = getFocusableIndex();

  return (
    <div ref={containerRef} role="radiogroup" aria-label="Farbe auswählen" className={cn('grid grid-cols-3 gap-3', disabled && 'cursor-not-allowed opacity-50', className)}>
      {allItems.map((preset, index) => {
        const isSelected = preset.value === value;
        const isResetButton = preset.value === undefined;
        const isFocusable = index === focusableIndex;

        return (
          // biome-ignore lint/a11y/useSemanticElements: Custom RadioGroup mit button ist hier beabsichtigt
          <button
            key={preset.value ?? 'none'}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled}
            aria-label={preset.name}
            // L1 Fix: Native Tooltip für Farbname bei Hover
            title={preset.name}
            tabIndex={disabled ? -1 : isFocusable ? 0 : -1}
            onClick={() => handleColorClick(preset.value as ServerColorValue | undefined)}
            onKeyDown={(e) => handleKeyDown(e, index, preset.value as ServerColorValue | undefined)}
            className={cn(
              // Basis-Styling
              'h-8 w-8 rounded-full transition-transform',
              // Hover-Effekt
              !disabled && 'hover:scale-110',
              // Focus-Styling
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              // Selection-Styling (ring-blue-500 für Dark Mode bessere Sichtbarkeit)
              // Ring nur wenn nicht fokussiert, um Konflikt mit focus-visible Ring zu vermeiden
              isSelected && 'ring-2 ring-gray-900 ring-offset-2 focus-visible:ring-blue-500 dark:ring-blue-500',
              // Farbe oder Reset-Button
              isResetButton ? 'border-2 border-gray-400 border-dashed bg-gray-200 dark:border-gray-500 dark:bg-gray-700' : getServerColorClass(preset.value, 'bg'),
              // Cursor
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            )}
          />
        );
      })}
    </div>
  );
}
