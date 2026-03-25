/**
 * ServerIconPicker Molekül
 *
 * Icon-Auswahl-Komponente für Server-Konfigurationen.
 * Ermöglicht die Auswahl eines vordefinierten Icons oder keines Icons.
 *
 * **Features:**
 * - Grid-Layout mit 4 Spalten für 8 Icons + "Kein Icon" Option
 * - Selected-State mit Ring-Styling
 * - Volle Keyboard-Navigation (Arrow Keys, Enter, Space)
 * - Accessibility: radiogroup, ARIA Labels
 * - Disabled State
 *
 * @module features/server/ui/molecules/ServerIconPicker
 */

import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { SERVER_ICON_PRESETS, type ServerIconValue } from '../../constants/server-icons';
import { getServerIconComponent } from '../../utils/server-icon.utils';

/**
 * Props für die ServerIconPicker Komponente.
 */
export interface ServerIconPickerProps {
  /**
   * Aktuell ausgewähltes Icon.
   * undefined bedeutet "Kein Icon" ausgewählt.
   */
  value?: string;
  /**
   * Callback wenn ein Icon ausgewählt wird.
   * Wird mit dem Icon-Value oder undefined aufgerufen.
   */
  onChange: (icon: string | undefined) => void;
  /**
   * Deaktiviert alle Icon-Buttons.
   */
  disabled?: boolean;
  /**
   * Zusätzliche CSS-Klassen für den Container.
   */
  className?: string;
}

/** Anzahl der Spalten im Grid */
const GRID_COLUMNS = 4;

/**
 * Einzelner Icon-Button im Picker
 */
interface IconButtonProps {
  /**
   * Icon-Value (z.B. 'building') oder undefined für "Kein Icon"
   */
  iconValue: ServerIconValue | undefined;
  /**
   * Deutscher Anzeigename
   */
  name: string;
  /**
   * Ob dieser Button ausgewählt ist
   */
  isSelected: boolean;
  /**
   * Ob der Button deaktiviert ist
   */
  disabled: boolean;
  /**
   * Click-Handler
   */
  onClick: (value: ServerIconValue | undefined) => void;
  /**
   * Keyboard-Handler für Arrow Navigation
   */
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  /**
   * Index im Grid für Keyboard Navigation
   */
  index: number;
  /**
   * React Icon Component oder undefined für "Kein Icon"
   */
  IconComponent?: React.ComponentType<{ className?: string }>;
  /**
   * Ob dieser Button fokussierbar ist (roving tabindex)
   */
  isFocusable: boolean;
}

/**
 * Icon Button Komponente
 *
 * Einzelner auswählbarer Icon-Button im Grid.
 */
function IconButton({ iconValue, name, isSelected, disabled, onClick, onKeyDown, index, IconComponent, isFocusable }: IconButtonProps) {
  const handleClick = useCallback(() => {
    if (disabled) return;
    // Nicht aufrufen wenn bereits ausgewählt
    if (isSelected) return;
    onClick(iconValue);
  }, [disabled, isSelected, onClick, iconValue]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (disabled) return;
        if (isSelected) return;
        onClick(iconValue);
      } else {
        onKeyDown(e, index);
      }
    },
    [disabled, isSelected, onClick, iconValue, onKeyDown, index],
  );

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Custom Radio Group Pattern - Button mit role="radio" ermöglicht flexibles Grid-Layout und konsistentes Styling mit anderen Picker-Komponenten (ServerColorPicker)
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      aria-label={name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : isFocusable ? 0 : -1}
      className={cn(
        // Base styles
        'flex flex-col items-center justify-center gap-1 rounded-lg p-3',
        'transition-all duration-150',
        // Border
        'border border-border-subtle',
        // Hover (when not disabled)
        !disabled && 'hover:bg-action-secondary',
        // Focus visible
        'focus-visible:shadow-focus-ring focus-visible:outline-none',
        // Selected state
        isSelected && 'bg-action-secondary ring-2 ring-action-primary ring-offset-2 ring-offset-surface-panel',
        // Disabled state
        disabled && 'cursor-not-allowed opacity-50',
        // Normal cursor when enabled
        !disabled && 'cursor-pointer',
      )}
    >
      {IconComponent ? <IconComponent className="size-6 text-text-secondary" /> : <PiX className="size-6 text-text-secondary" />}
      <span className="text-xs text-text-muted">{name}</span>
    </button>
  );
}

/**
 * ServerIconPicker Komponente
 *
 * Ermöglicht die Auswahl eines Server-Icons aus einer vordefinierten Liste.
 * Unterstützt "Kein Icon" als Option.
 *
 * @example
 * ```tsx
 * // Basis-Verwendung
 * <ServerIconPicker
 *   value={selectedIcon}
 *   onChange={setSelectedIcon}
 * />
 *
 * // Mit disabled State
 * <ServerIconPicker
 *   value="building"
 *   onChange={handleChange}
 *   disabled
 * />
 * ```
 */
export function ServerIconPicker({ value, onChange, disabled = false, className }: ServerIconPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalisiere leeren String zu undefined
  const normalizedValue = value === '' ? undefined : value;

  // Prüfe ob der Wert gültig ist
  const isValidValue = normalizedValue === undefined || SERVER_ICON_PRESETS.some((p) => p.value === normalizedValue);

  // Build options array: "Kein Icon" first, then all presets
  // Wrapped in useMemo to prevent re-creation on every render
  const options = useMemo<Array<{ value: ServerIconValue | undefined; name: string }>>(
    () => [{ value: undefined, name: 'Kein Icon' }, ...SERVER_ICON_PRESETS.map((preset) => ({ value: preset.value, name: preset.name }))],
    [],
  );

  // Bestimmt welches Item den Fokus-TabIndex haben soll (roving tabindex)
  const getFocusableIndex = useCallback(() => {
    // Finde das ausgewählte Item
    const selectedIndex = options.findIndex((opt) => opt.value === normalizedValue);
    // Falls ausgewählt, dieses fokussierbar machen, sonst das erste
    return selectedIndex >= 0 ? selectedIndex : 0;
  }, [normalizedValue, options]);

  const focusableIndex = getFocusableIndex();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex: number | null = null;
      const totalItems = options.length;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % totalItems;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + totalItems) % totalItems;
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Move down one row - bei letzter Zeile am aktuellen Item bleiben (konsistent mit ArrowUp)
          nextIndex = currentIndex + GRID_COLUMNS;
          if (nextIndex >= totalItems) {
            // Bleib am aktuellen Item wenn wir über das Ende hinaus gehen würden
            nextIndex = currentIndex;
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Move up one row - bei erster Zeile am aktuellen Item bleiben
          nextIndex = currentIndex - GRID_COLUMNS;
          if (nextIndex < 0) {
            // Bleib am aktuellen Item wenn wir über den Anfang hinaus gehen würden
            nextIndex = currentIndex;
          }
          break;
      }

      if (nextIndex !== null) {
        const buttonElements = containerRef.current?.querySelectorAll('[role="radio"]');
        const nextButton = buttonElements?.[nextIndex] as HTMLButtonElement | null;
        nextButton?.focus();
      }
    },
    [options.length],
  );

  const handleChange = useCallback(
    (iconValue: ServerIconValue | undefined) => {
      onChange(iconValue);
    },
    [onChange],
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-text-secondary">Icon auswählen</span>
      <div ref={containerRef} role="radiogroup" aria-label="Server-Icon auswählen" className="grid grid-cols-4 gap-2">
        {options.map((option, index) => {
          const isSelected = isValidValue && normalizedValue === option.value;
          const IconComponent = option.value ? getServerIconComponent(option.value) : undefined;
          const isFocusable = index === focusableIndex;

          return (
            <IconButton
              key={option.value ?? 'no-icon'}
              iconValue={option.value}
              name={option.name}
              isSelected={isSelected}
              disabled={disabled}
              onClick={handleChange}
              onKeyDown={handleKeyDown}
              index={index}
              IconComponent={IconComponent}
              isFocusable={isFocusable}
            />
          );
        })}
      </div>
    </div>
  );
}
