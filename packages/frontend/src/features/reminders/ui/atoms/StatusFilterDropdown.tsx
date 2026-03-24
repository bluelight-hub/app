/**
 * StatusFilterDropdown Komponente fuer Status-Filterung
 *
 * Dropdown zur Filterung von Erinnerungen nach Status.
 * Nutzt Headless UI Listbox fuer accessibility-konforme Implementierung.
 *
 * **Story 8.4 Task 2:**
 * - AC1: Filter-Dropdown mit allen Status plus "Alle Status"
 * - AC3: Visuelles Feedback bei aktivem Filter (Primary-Farben)
 * - AC5: Status-Icons mit Farb-Klassen
 */

import { cn } from '@/shared/ui/cn';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useCallback, useMemo } from 'react';
import type { IconType } from 'react-icons';
import { PiBellRinging, PiCaretDown, PiCheck, PiCheckCircle, PiCirclesThree, PiClock, PiFunnel, PiMoon, PiTrendUp } from 'react-icons/pi';
import { createStatusFilter, statusFilterToValue, type StatusFilterType } from '../../stores';

export interface StatusFilterDropdownProps {
  /** Aktuell ausgewaehlter Filter */
  selectedFilter: StatusFilterType;
  /** Callback bei Filter-Aenderung */
  onFilterChange: (filter: StatusFilterType) => void;
  /** Deaktiviert das Dropdown */
  disabled?: boolean;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/** Status-Option Interface */
interface StatusOption {
  /** String-Wert fuer Listbox (intern) */
  value: string;
  /** Anzeige-Label */
  label: string;
  /** Icon Komponente */
  icon: IconType;
  /** Optionale Farb-Klasse fuer das Icon */
  colorClass?: string;
}

/** Status-Filter-Optionen (AC1: alle Status) */
const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'Alle Status', icon: PiCirclesThree },
  { value: 'GEPLANT', label: 'Geplant', icon: PiClock, colorClass: 'text-status-success-text' },
  { value: 'AUSGELOEST', label: 'Ausgelöst', icon: PiBellRinging, colorClass: 'text-status-danger-text' },
  { value: 'ACKNOWLEDGED', label: 'Bestätigt', icon: PiCheck, colorClass: 'text-status-info-text' },
  { value: 'SNOOZED', label: 'Verschoben', icon: PiMoon, colorClass: 'text-status-warning-text' },
  { value: 'ESKALIERT', label: 'Eskaliert', icon: PiTrendUp, colorClass: 'text-action-primary' },
  { value: 'ERLEDIGT', label: 'Erledigt', icon: PiCheckCircle, colorClass: 'text-text-muted' },
];

/**
 * StatusFilterDropdown - Dropdown zur Filterung nach Erinnerungs-Status
 *
 * Zeigt alle moeglichen Status-Werte mit Icons und Farben zur visuellen Unterscheidung.
 */
export function StatusFilterDropdown({ selectedFilter, onFilterChange, disabled = false, className }: StatusFilterDropdownProps) {
  /** Konvertiert StatusFilterType zu String fuer Listbox */
  const selectedValue = useMemo(() => statusFilterToValue(selectedFilter), [selectedFilter]);

  /** Ermittelt die aktuelle Option fuer den Filter */
  const currentOption = useMemo(() => {
    return STATUS_OPTIONS.find((opt) => opt.value === selectedValue) ?? STATUS_OPTIONS[0];
  }, [selectedValue]);

  /** Ist ein aktiver Filter gesetzt (nicht "Alle")? (AC3) */
  const isFilterActive = selectedFilter.type !== 'all';

  /** Handler der String-Wert zu StatusFilterType konvertiert */
  const handleChange = useCallback(
    (value: string) => {
      onFilterChange(createStatusFilter(value));
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
          <PiFunnel className={cn('h-4 w-4 flex-shrink-0', isFilterActive ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          <span className="block truncate font-medium">{currentOption.label}</span>
          <PiCaretDown className={cn('ml-auto h-4 w-4 flex-shrink-0', isFilterActive ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
        </ListboxButton>

        <ListboxOptions
          transition
          className={cn(
            'absolute z-20 mt-1 max-h-60 w-full min-w-[180px] overflow-auto rounded-panel bg-surface-panel py-1 text-sm shadow-panel',
            'border border-border-subtle',
            'focus:outline-none',
            'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in',
          )}
        >
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <ListboxOption
                key={option.value}
                value={option.value}
                className={cn('relative flex cursor-pointer select-none items-center gap-2 px-3 py-2', 'text-text-primary', 'data-[focus]:bg-primary-50 data-[focus]:text-primary-900')}
              >
                {({ selected }) => (
                  <>
                    <Icon className={cn('h-4 w-4 flex-shrink-0', option.colorClass ?? 'text-text-muted')} aria-hidden="true" />
                    <span className={cn('block truncate', selected && 'font-semibold')}>{option.label}</span>
                    {selected && <PiCheck className="ml-auto h-4 w-4 text-action-primary" aria-hidden="true" />}
                  </>
                )}
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
