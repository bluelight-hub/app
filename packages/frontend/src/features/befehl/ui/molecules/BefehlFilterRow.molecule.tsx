/**
 * BefehlFilterRow Molecule
 *
 * Inline-Filter-Row mit Multi-Select Status-Dropdown,
 * Empfaenger-Combobox, Befehlsgeber-Listbox, Zeitraum-Filter,
 * Freitext-Suche und Reset-Button.
 */

import type { BefehlDtoStatusEnum } from '@bluelight-hub/shared/client';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PiCalendar, PiCaretDown, PiCheck, PiFunnel, PiMagnifyingGlass, PiUser, PiUsers, PiX } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { debounce } from '@tanstack/pacer';

interface BefehlFilterRowProps {
  statusFilter: BefehlDtoStatusEnum[];
  onStatusFilterChange: (statuses: BefehlDtoStatusEnum[]) => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  empfaengerName: string;
  onEmpfaengerNameChange: (name: string) => void;
  empfaengerOptions: string[];
  befehlsgeberName: string;
  onBefehlsgeberNameChange: (name: string) => void;
  befehlsgeberOptions: string[];
  von: string;
  onVonChange: (date: string) => void;
  bis: string;
  onBisChange: (date: string) => void;
  onReset: () => void;
  activeFilterCount: number;
  className?: string;
}

/** Status-Optionen fuer den Multi-Select Dropdown */
const STATUS_OPTIONS = [
  { value: 'ERTEILT', label: 'Erteilt' },
  { value: 'ZUGESTELLT', label: 'Zugestellt' },
  { value: 'QUITTIERT', label: 'Quittiert' },
  { value: 'KORRIGIERT', label: 'Korrigiert' },
] as const;

/** Aktiv/Inaktiv Styling fuer Filter-Controls */
const activeClasses = 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-300';
const inactiveClasses = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';

export function BefehlFilterRow({
  statusFilter,
  onStatusFilterChange,
  searchText,
  onSearchTextChange,
  empfaengerName,
  onEmpfaengerNameChange,
  empfaengerOptions,
  befehlsgeberName,
  onBefehlsgeberNameChange,
  befehlsgeberOptions,
  von,
  onVonChange,
  bis,
  onBisChange,
  onReset,
  activeFilterCount,
  className,
}: BefehlFilterRowProps) {
  const [localSearch, setLocalSearch] = useState(searchText);
  const [empfaengerQuery, setEmpfaengerQuery] = useState('');

  /** Sync localSearch wenn Parent den searchText aendert (z.B. bei Reset) */
  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  /** Sync empfaengerQuery wenn empfaengerName extern zurueckgesetzt wird */
  useEffect(() => {
    if (empfaengerName === '') {
      setEmpfaengerQuery('');
    }
  }, [empfaengerName]);

  const debouncedSearch = useCallback(
    debounce(
      (value: string) => {
        onSearchTextChange(value);
      },
      { wait: 300 },
    ),
    [],
  );

  const debouncedEmpfaenger = useCallback(
    debounce(
      (value: string) => {
        onEmpfaengerNameChange(value);
      },
      { wait: 500 },
    ),
    [],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSearch(value);
  };

  /** Gefilterte Empfaenger-Suggestions basierend auf Eingabe */
  const filteredEmpfaenger = useMemo(() => {
    if (empfaengerQuery === '') return empfaengerOptions;
    const query = empfaengerQuery.toLowerCase();
    return empfaengerOptions.filter((name) => name.toLowerCase().includes(query));
  }, [empfaengerOptions, empfaengerQuery]);

  const hasActiveFilters = activeFilterCount > 0;

  /** Button-Label fuer den Status-Dropdown */
  const statusButtonLabel = statusFilter.length === 0 ? 'Alle Status' : `${statusFilter.length} Status`;

  /** Button-Label fuer den Befehlsgeber-Dropdown */
  const befehlsgeberButtonLabel = befehlsgeberName === '' ? 'Alle Befehlsgeber' : befehlsgeberName;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Status Multi-Select Dropdown */}
      <Listbox as="div" value={statusFilter} onChange={onStatusFilterChange} multiple>
        <div className="relative">
          <ListboxButton
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              statusFilter.length > 0 ? activeClasses : inactiveClasses,
            )}
            aria-label="Status filtern"
          >
            <PiFunnel className={cn('h-4 w-4 flex-shrink-0', statusFilter.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
            <span className="font-medium">{statusButtonLabel}</span>
            <PiCaretDown className={cn('h-4 w-4 flex-shrink-0', statusFilter.length > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 w-48 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg',
              'border border-gray-200 ring-1 ring-black/5 focus:outline-none',
              'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in motion-reduce:data-[leave]:duration-0',
              'dark:border-gray-700 dark:bg-gray-800',
            )}
          >
            {STATUS_OPTIONS.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 px-3 py-2',
                  'text-gray-900 dark:text-gray-100',
                  'data-[focus]:bg-primary-50 data-[focus]:text-primary-900',
                  'dark:data-[focus]:bg-primary-900/30 dark:data-[focus]:text-primary-100',
                )}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                        selected ? 'border-primary-600 bg-primary-600 dark:border-primary-400 dark:bg-primary-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700',
                      )}
                    >
                      {selected && <PiCheck className="h-3 w-3 text-white dark:text-gray-900" aria-hidden="true" />}
                    </span>
                    <span className={cn('block truncate', selected && 'font-semibold')}>{option.label}</span>
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      {/* Empfaenger Combobox (Typeahead) */}
      <Combobox value={empfaengerName} onChange={(value) => onEmpfaengerNameChange(value ?? '')} onClose={() => setEmpfaengerQuery('')}>
        <div className="relative">
          <div
            className={cn(
              'relative flex items-center rounded-lg border text-sm',
              'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
              empfaengerName ? activeClasses : inactiveClasses,
            )}
          >
            <PiUsers className={cn('ml-3 h-4 w-4 flex-shrink-0', empfaengerName ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
            <ComboboxInput
              className={cn(
                'w-full border-none bg-transparent py-2 pl-2 pr-8 text-sm font-medium focus:outline-none',
                empfaengerName ? 'text-primary-700 placeholder:text-primary-400 dark:text-primary-300' : 'text-gray-700 placeholder:text-gray-400 dark:text-gray-300',
              )}
              placeholder="Empfänger..."
              aria-label="Empfänger filtern"
              displayValue={(val: string) => val}
              onChange={(e) => {
                setEmpfaengerQuery(e.target.value);
                debouncedEmpfaenger(e.target.value);
              }}
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
              <PiCaretDown className={cn('h-4 w-4', empfaengerName ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg',
              'border border-gray-200 ring-1 ring-black/5 focus:outline-none',
              'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in motion-reduce:data-[leave]:duration-0',
              'dark:border-gray-700 dark:bg-gray-800',
            )}
          >
            {/* Leere Option zum Zuruecksetzen */}
            <ComboboxOption
              value=""
              className={cn(
                'relative flex cursor-pointer select-none items-center px-3 py-2 text-gray-500 italic',
                'data-[focus]:bg-primary-50 data-[focus]:text-primary-900',
                'dark:text-gray-400 dark:data-[focus]:bg-primary-900/30 dark:data-[focus]:text-primary-100',
              )}
            >
              Alle Empfänger
            </ComboboxOption>
            {filteredEmpfaenger.map((name) => (
              <ComboboxOption
                key={name}
                value={name}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 px-3 py-2',
                  'text-gray-900 dark:text-gray-100',
                  'data-[focus]:bg-primary-50 data-[focus]:text-primary-900',
                  'dark:data-[focus]:bg-primary-900/30 dark:data-[focus]:text-primary-100',
                )}
              >
                {({ selected }) => <span className={cn('block truncate', selected && 'font-semibold')}>{name}</span>}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>

      {/* Befehlsgeber Listbox */}
      <Listbox as="div" value={befehlsgeberName} onChange={onBefehlsgeberNameChange}>
        <div className="relative">
          <ListboxButton
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              befehlsgeberName ? activeClasses : inactiveClasses,
            )}
            aria-label="Befehlsgeber filtern"
          >
            <PiUser className={cn('h-4 w-4 flex-shrink-0', befehlsgeberName ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
            <span className="font-medium truncate max-w-[120px]">{befehlsgeberButtonLabel}</span>
            <PiCaretDown className={cn('h-4 w-4 flex-shrink-0', befehlsgeberName ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-48 w-48 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg',
              'border border-gray-200 ring-1 ring-black/5 focus:outline-none',
              'data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in motion-reduce:data-[leave]:duration-0',
              'dark:border-gray-700 dark:bg-gray-800',
            )}
          >
            {/* Leere Option = "Alle" */}
            <ListboxOption
              value=""
              className={cn(
                'relative flex cursor-pointer select-none items-center px-3 py-2 text-gray-500 italic',
                'data-[focus]:bg-primary-50 data-[focus]:text-primary-900',
                'dark:text-gray-400 dark:data-[focus]:bg-primary-900/30 dark:data-[focus]:text-primary-100',
              )}
            >
              Alle Befehlsgeber
            </ListboxOption>
            {befehlsgeberOptions.map((name) => (
              <ListboxOption
                key={name}
                value={name}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 px-3 py-2',
                  'text-gray-900 dark:text-gray-100',
                  'data-[focus]:bg-primary-50 data-[focus]:text-primary-900',
                  'dark:data-[focus]:bg-primary-900/30 dark:data-[focus]:text-primary-100',
                )}
              >
                {({ selected }) => <span className={cn('block truncate', selected && 'font-semibold')}>{name}</span>}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      {/* Zeitraum: Von / Bis */}
      <div className="flex items-center gap-2">
        <div
          className={cn('relative flex items-center rounded-lg border text-sm', 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2', von ? activeClasses : inactiveClasses)}
        >
          <PiCalendar className={cn('ml-3 h-4 w-4 flex-shrink-0', von ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
          <input
            type="date"
            value={von}
            onChange={(e) => onVonChange(e.target.value)}
            aria-label="Befehle ab Datum"
            className={cn(
              'border-none bg-transparent py-2 pl-2 pr-3 text-sm font-medium focus:outline-none',
              von ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300',
              'dark:[color-scheme:dark]',
            )}
          />
        </div>
        <span className="text-xs text-gray-400">–</span>
        <div
          className={cn('relative flex items-center rounded-lg border text-sm', 'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2', bis ? activeClasses : inactiveClasses)}
        >
          <PiCalendar className={cn('ml-3 h-4 w-4 flex-shrink-0', bis ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} aria-hidden="true" />
          <input
            type="date"
            value={bis}
            onChange={(e) => onBisChange(e.target.value)}
            aria-label="Befehle bis Datum"
            className={cn(
              'border-none bg-transparent py-2 pl-2 pr-3 text-sm font-medium focus:outline-none',
              bis ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300',
              'dark:[color-scheme:dark]',
            )}
          />
        </div>
      </div>

      {/* Freitext-Suche */}
      <div className="relative flex-1 min-w-[180px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <PiMagnifyingGlass className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder="Suche in Befehlen..."
          aria-label="Befehle durchsuchen"
          className={cn(
            'w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm',
            'placeholder:text-gray-400',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
          )}
        />
      </div>

      {/* Filter Badge + Reset */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            Filter ({activeFilterCount})
          </span>
          <button
            type="button"
            onClick={onReset}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
              'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
            )}
            aria-label="Filter zurücksetzen"
          >
            <PiX className="h-3.5 w-3.5" aria-hidden="true" />
            Zurücksetzen
          </button>
        </div>
      )}
    </div>
  );
}
