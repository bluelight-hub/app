/**
 * TeamFilterDropdown Komponente fuer Team-Erinnerungen Filterung
 *
 * Dropdown zur Filterung der Team-Erinnerungsliste nach Zuweisung.
 * Nutzt Headless UI Listbox fuer accessibility-konforme Implementierung.
 *
 * **Story 3.6 Task 2:**
 * - AC1: Filter-Dropdown mit allen Optionen
 * - AC2: Visuelles Feedback bei aktivem Filter
 * - AC5: Filter-Reset auf "Alle"
 */

import { cn } from '@/shared/ui/cn';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useCallback, useMemo } from 'react';
import { PiCaretDown, PiCheck, PiFunnel, PiUser, PiUsers } from 'react-icons/pi';
import { createTeamFilter, teamFilterToValue, type TeamFilterType, type Teilnehmer } from '../../stores';

export interface TeamFilterDropdownProps {
  /** Aktuell ausgewaehlter Filter */
  selectedFilter: TeamFilterType;
  /** Callback bei Filter-Aenderung */
  onFilterChange: (filter: TeamFilterType) => void;
  /** Liste der verfuegbaren Einsatz-Teilnehmer */
  teilnehmer: Teilnehmer[];
  /** ID des aktuellen Benutzers (fuer "Meine" Filter) */
  currentUserId: string;
  /** Deaktiviert das Dropdown */
  disabled?: boolean;
  /** Zusaetzliche CSS-Klassen */
  className?: string;
}

/** Basis-Filter-Optionen (immer sichtbar) */
interface FilterOption {
  /** String-Wert fuer Listbox (intern) */
  value: string;
  /** Anzeige-Label */
  label: string;
  /** Optional: Icon-Element */
  icon?: React.ReactNode;
}

const BASE_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Alle', icon: <PiUsers className="h-4 w-4" /> },
  { value: 'mine', label: 'Meine', icon: <PiUser className="h-4 w-4" /> },
  { value: 'unassigned', label: 'Unzugewiesen', icon: <PiFunnel className="h-4 w-4" /> },
];

/**
 * TeamFilterDropdown - Dropdown zur Filterung von Team-Erinnerungen
 *
 * Zeigt Basis-Optionen (Alle, Meine, Unzugewiesen) und dynamisch geladene
 * Einsatz-Teilnehmer zur Filterung nach spezifischen Personen.
 */
export function TeamFilterDropdown({ selectedFilter, onFilterChange, teilnehmer, currentUserId, disabled = false, className }: TeamFilterDropdownProps) {
  /** Konvertiert TeamFilterType zu String fuer Listbox */
  const selectedValue = useMemo(() => teamFilterToValue(selectedFilter), [selectedFilter]);

  /** Ermittelt das Label fuer den aktuellen Filter */
  const currentLabel = useMemo(() => {
    // Basis-Optionen pruefen
    const baseOption = BASE_OPTIONS.find((opt) => opt.value === selectedValue);
    if (baseOption) return baseOption.label;

    // Teilnehmer-Name suchen (fuer user-Filter)
    if (selectedFilter.type === 'user') {
      const teilnehmerMatch = teilnehmer.find((t) => t.id === selectedFilter.userId);
      if (teilnehmerMatch) return teilnehmerMatch.name;
    }

    // Fallback fuer unbekannte Filter
    return 'Filter';
  }, [selectedFilter, selectedValue, teilnehmer]);

  /** Teilnehmer-Optionen fuer das Dropdown */
  const teilnehmerOptions: FilterOption[] = useMemo(
    () =>
      teilnehmer
        .filter((t) => t.id !== currentUserId) // Eigenen User ausschliessen (ist bereits in "Meine")
        .map((t) => ({
          value: t.id,
          label: t.name,
          icon: <PiUser className="h-4 w-4" />,
        })),
    [teilnehmer, currentUserId],
  );

  /** Ist ein aktiver Filter gesetzt (nicht "Alle")? */
  const isFilterActive = selectedFilter.type !== 'all';

  /** Handler der String-Wert zu TeamFilterType konvertiert */
  const handleChange = useCallback(
    (value: string) => {
      onFilterChange(createTeamFilter(value));
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
            // Aktiver Filter: Primary-Farben
            isFilterActive ? 'border-action-primary/35 bg-primary-50 text-action-primary' : 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-surface-raised',
          )}
        >
          <PiFunnel className={cn('h-4 w-4 flex-shrink-0', isFilterActive ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          <span className="block truncate font-medium">{currentLabel}</span>
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
          {/* Basis-Optionen */}
          {BASE_OPTIONS.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={cn('relative flex cursor-pointer select-none items-center gap-2 px-3 py-2', 'text-text-primary', 'data-[focus]:bg-primary-50 data-[focus]:text-primary-900')}
            >
              {({ selected }) => (
                <>
                  {option.icon}
                  <span className={cn('block truncate', selected && 'font-semibold')}>{option.label}</span>
                  {selected && <PiCheck className="ml-auto h-4 w-4 text-action-primary" aria-hidden="true" />}
                </>
              )}
            </ListboxOption>
          ))}

          {/* Divider wenn Teilnehmer vorhanden */}
          {teilnehmerOptions.length > 0 && <div className="my-1 border-border-subtle border-t" />}

          {/* Teilnehmer-Optionen */}
          {teilnehmerOptions.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={cn('relative flex cursor-pointer select-none items-center gap-2 px-3 py-2', 'text-text-primary', 'data-[focus]:bg-primary-50 data-[focus]:text-primary-900')}
            >
              {({ selected }) => (
                <>
                  {option.icon}
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
