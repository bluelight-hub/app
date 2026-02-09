import { useCallback, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/shared/ui/cn';
import { PiBellRinging, PiListBullets, PiNotepad } from 'react-icons/pi';

export type ItemTypeFilter = 'alle' | 'erinnerungen' | 'notizen';

interface ItemTypeFilterProps {
  value: ItemTypeFilter;
  onChange: (filter: ItemTypeFilter) => void;
  className?: string;
}

const filterOptions: { value: ItemTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'alle', label: 'Alle', icon: <PiListBullets className="h-4 w-4" aria-hidden="true" /> },
  { value: 'erinnerungen', label: 'Erinnerungen', icon: <PiBellRinging className="h-4 w-4" aria-hidden="true" /> },
  { value: 'notizen', label: 'Notizen', icon: <PiNotepad className="h-4 w-4" aria-hidden="true" /> },
];

/**
 * Molecule: Segmented Control zum Filtern nach Typ (Story 7.5 AC2).
 *
 * Drei Optionen: Alle | Erinnerungen | Notizen
 * Aktiver Filter ist visuell hervorgehoben.
 * Unterstützt Keyboard-Navigation (Pfeiltasten, Enter, Space) und Roving Tabindex.
 */
export function ItemTypeFilterControl({ value, onChange, className }: ItemTypeFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /** Bestimmt den Index des aktuell fokussierbaren Elements (Roving Tabindex). */
  const focusableIndex = filterOptions.findIndex((o) => o.value === value);

  /**
   * Behandelt Keyboard-Events für Navigation und Auswahl.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const totalItems = filterOptions.length;

      // Auswahl mit Enter oder Space
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onChange(filterOptions[index].value);
        return;
      }

      // Navigation mit Pfeiltasten
      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextIndex = (index + 1) % totalItems;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          nextIndex = index === 0 ? totalItems - 1 : index - 1;
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
    [onChange],
  );

  return (
    <div ref={containerRef} className={cn('inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800', className)} role="radiogroup" aria-label="Typ-Filter">
      {filterOptions.map((option, index) => {
        const isSelected = value === option.value;
        const isFocusable = index === focusableIndex;

        return (
          // biome-ignore lint/a11y/useSemanticElements: segmented control uses button-based radio pattern
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isFocusable ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              isSelected ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
