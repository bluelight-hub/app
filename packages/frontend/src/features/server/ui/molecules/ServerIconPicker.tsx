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
import { Button } from '@/components/ui/button';
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
const GRID_COLUMNS = 5;

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
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={disabled}
      aria-label={name}
      title={name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : isFocusable ? 0 : -1}
      disabled={disabled}
      className={cn(
        '!rounded-xl size-9 border-slate-200/80 bg-white/90 p-0 text-slate-600 shadow-sm disabled:cursor-not-allowed dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-300',
        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2',
        isSelected && 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/35 ring-offset-2 dark:border-sky-400 dark:bg-sky-950/40 dark:text-sky-100 dark:ring-sky-400/30',
      )}
    >
      {IconComponent ? <IconComponent className="size-[18px]" /> : <PiX className="size-[18px]" />}
      <span className="sr-only">{name}</span>
    </Button>
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
      <span className="font-medium text-slate-700 text-sm dark:text-slate-200">Icon auswählen</span>
      <div ref={containerRef} role="radiogroup" aria-label="Server-Icon auswählen" className="grid grid-cols-5 gap-2">
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
