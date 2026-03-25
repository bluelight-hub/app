/**
 * KategorieFilterDropdown Komponente fuer Kategorie-Filterung
 *
 * Dropdown zur Filterung von Erinnerungen/Notizen nach Kategorie.
 * Nutzt Headless UI Listbox fuer accessibility-konforme Implementierung.
 *
 * **Story 8.3 Task 2:**
 * - AC1: Filter-Dropdown mit allen Kategorien plus "Alle" und "Ohne Kategorie"
 * - AC3: Visuelles Feedback bei aktivem Filter (Primary-Farben)
 * - AC5: Kategorie-Chip in Optionen (Farb-Kreis)
 */

import { cn } from '@/shared/ui/cn';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useCallback, useMemo } from 'react';
import { PiCaretDown, PiCheck, PiTag, PiTagSimple } from 'react-icons/pi';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';
import { createKategorieFilter, kategorieFilterToValue, type KategorieFilterType } from '../../stores';

export interface KategorieFilterDropdownProps {
  /** Aktuell ausgewaehlter Filter */
  selectedFilter: KategorieFilterType;
  /** Callback bei Filter-Aenderung */
  onFilterChange: (filter: KategorieFilterType) => void;
  /** Liste der verfuegbaren Kategorien */
  kategorien: KategorieResponseDto[];
  /** Deaktiviert das Dropdown */
  disabled?: boolean;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/** Filter-Option Interface */
interface FilterOption {
  /** String-Wert fuer Listbox (intern) */
  value: string;
  /** Anzeige-Label */
  label: string;
  /** Optional: Kategorie-Farbe (Hex-Code) */
  farbe?: string;
}

/** Basis-Filter-Optionen (AC1: immer sichtbar) */
const BASE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Alle Kategorien' },
  { value: 'untagged', label: 'Ohne Kategorie' },
];

/**
 * KategorieFilterDropdown - Dropdown zur Filterung nach Kategorie
 *
 * Zeigt Basis-Optionen (Alle Kategorien, Ohne Kategorie) und dynamisch geladene
 * Kategorien mit Farb-Kreis zur visuellen Unterscheidung.
 */
export function KategorieFilterDropdown({ selectedFilter, onFilterChange, kategorien, disabled = false, className }: KategorieFilterDropdownProps) {
  /** Konvertiert KategorieFilterType zu String fuer Listbox */
  const selectedValue = useMemo(() => kategorieFilterToValue(selectedFilter), [selectedFilter]);

  /** Ermittelt das Label fuer den aktuellen Filter */
  const currentLabel = useMemo(() => {
    // Basis-Optionen pruefen
    const baseOption = BASE_OPTIONS.find((opt) => opt.value === selectedValue);
    if (baseOption) return baseOption.label;

    // Kategorie-Name suchen (fuer kategorie-Filter)
    if (selectedFilter.type === 'kategorie') {
      const kategorieMatch = kategorien.find((k) => k.id === selectedFilter.kategorieId);
      if (kategorieMatch) return kategorieMatch.name;
    }

    // Fallback fuer unbekannte Filter
    return 'Kategorie';
  }, [selectedFilter, selectedValue, kategorien]);

  /** Kategorie-Optionen fuer das Dropdown (AC5: mit Farb-Kreis) */
  const kategorieOptions: FilterOption[] = useMemo(
    () =>
      kategorien.map((k) => ({
        value: k.id,
        label: k.name,
        farbe: k.farbe,
      })),
    [kategorien],
  );

  /** Ist ein aktiver Filter gesetzt (nicht "Alle")? (AC3) */
  const isFilterActive = selectedFilter.type !== 'all';

  /** Handler der String-Wert zu KategorieFilterType konvertiert */
  const handleChange = useCallback(
    (value: string) => {
      onFilterChange(createKategorieFilter(value));
    },
    [onFilterChange],
  );

  return (
    <Listbox as="div" value={selectedValue} onChange={handleChange} disabled={disabled}>
      <div className={cn('relative', className)}>
        <ListboxButton
          className={cn(
            'relative flex w-full cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-left text-sm',
            'transition-all duration-200',
            'focus:outline-none focus-visible:shadow-focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // AC3: Aktiver Filter mit Primary-Farben
            isFilterActive ? 'border-action-primary/35 bg-primary-50 text-action-primary' : 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-raised',
          )}
        >
          <PiTag className={cn('h-4 w-4 flex-shrink-0', isFilterActive ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          <span className="block truncate font-medium">{currentLabel}</span>
          <PiCaretDown className={cn('ml-auto h-4 w-4 flex-shrink-0', isFilterActive ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
        </ListboxButton>

        <ListboxOptions
          transition
          className={cn(
            'absolute z-20 mt-1 max-h-60 w-full min-w-[180px] overflow-auto rounded-panel bg-surface-panel py-1 text-sm shadow-panel',
            'border border-border-subtle',
            'focus:outline-none',
            'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0',
          )}
        >
          {/* AC1: Basis-Optionen (Alle Kategorien, Ohne Kategorie) */}
          {BASE_OPTIONS.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={cn('relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none', 'text-text-primary', 'data-[focus]:bg-primary-50 data-[focus]:text-primary-900')}
            >
              {({ selected }) => (
                <>
                  {option.value === 'untagged' ? <PiTagSimple className="h-4 w-4 text-text-muted" aria-hidden="true" /> : <PiTag className="h-4 w-4 text-text-muted" aria-hidden="true" />}
                  <span className={cn('block truncate', selected && 'font-semibold')}>{option.label}</span>
                  {selected && <PiCheck className="ml-auto h-4 w-4 text-action-primary" aria-hidden="true" />}
                </>
              )}
            </ListboxOption>
          ))}

          {/* Divider wenn Kategorien vorhanden */}
          {kategorieOptions.length > 0 && <div className="my-1 border-t border-border-subtle" />}

          {/* AC5: Kategorie-Optionen mit Farb-Kreis */}
          {kategorieOptions.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={cn('relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none', 'text-text-primary', 'data-[focus]:bg-primary-50 data-[focus]:text-primary-900')}
            >
              {({ selected }) => (
                <>
                  <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: option.farbe }} aria-hidden="true" />
                  <span className={cn('block truncate', selected && 'font-semibold')}>{option.label}</span>
                  {selected && <PiCheck className="ml-auto h-4 w-4 text-action-primary" aria-hidden="true" />}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
