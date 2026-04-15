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
import { Input } from '@/shared/ui/atoms/input.atom';
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
const activeClasses = 'border-action-primary bg-action-secondary text-action-primary';
const inactiveClasses = 'border-border-subtle bg-surface-panel text-text-secondary hover:bg-action-secondary';

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
              'focus:outline-none focus-visible:shadow-focus-ring',
              statusFilter.length > 0 ? activeClasses : inactiveClasses,
            )}
            aria-label="Status filtern"
          >
            <PiFunnel className={cn('h-4 w-4 flex-shrink-0', statusFilter.length > 0 ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
            <span className="font-medium">{statusButtonLabel}</span>
            <PiCaretDown className={cn('h-4 w-4 flex-shrink-0', statusFilter.length > 0 ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 w-48 overflow-auto rounded-lg bg-surface-panel py-1 text-sm shadow-lg',
              'border border-border-subtle ring-1 ring-border-subtle/50 focus:outline-none',
              'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 motion-reduce:data-[leave]:duration-0',
            )}
          >
            {STATUS_OPTIONS.map((option) => (
              <ListboxOption
                key={option.value}
                value={option.value}
                className={cn('relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none', 'text-text-primary', 'data-[focus]:bg-action-secondary data-[focus]:text-text-primary')}
              >
                {({ selected }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                        selected ? 'border-action-primary bg-action-primary' : 'border-border-subtle bg-surface-panel',
                      )}
                    >
                      {selected && <PiCheck className="h-3 w-3 text-text-inverse" aria-hidden="true" />}
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
          <div className={cn('relative flex items-center rounded-lg border text-sm', 'focus-within:shadow-focus-ring', empfaengerName ? activeClasses : inactiveClasses)}>
            <PiUsers className={cn('ml-3 h-4 w-4 flex-shrink-0', empfaengerName ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
            <ComboboxInput
              className={cn(
                'w-full border-none bg-transparent py-2 pr-8 pl-2 text-sm font-medium focus:outline-none',
                empfaengerName ? 'text-action-primary placeholder:text-text-muted' : 'text-text-secondary placeholder:text-text-muted',
              )}
              placeholder="Empfänger..."
              aria-label="Empfänger filtern"
              displayValue={(val: string) => val}
              onChange={(e) => {
                setEmpfaengerQuery(e.target.value);
                debouncedEmpfaenger(e.target.value);
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
              <PiCaretDown className={cn('h-4 w-4', empfaengerName ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-surface-panel py-1 text-sm shadow-lg',
              'border border-border-subtle ring-1 ring-border-subtle/50 focus:outline-none',
              'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 motion-reduce:data-[leave]:duration-0',
            )}
          >
            {/* Leere Option zum Zuruecksetzen */}
            <ComboboxOption
              value=""
              className={cn('relative flex cursor-pointer items-center px-3 py-2 text-text-muted italic select-none', 'data-[focus]:bg-action-secondary data-[focus]:text-text-primary')}
            >
              Alle Empfänger
            </ComboboxOption>
            {filteredEmpfaenger.map((name) => (
              <ComboboxOption
                key={name}
                value={name}
                className={cn('relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none', 'text-text-primary', 'data-[focus]:bg-action-secondary data-[focus]:text-text-primary')}
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
              'focus:outline-none focus-visible:shadow-focus-ring',
              befehlsgeberName ? activeClasses : inactiveClasses,
            )}
            aria-label="Befehlsgeber filtern"
          >
            <PiUser className={cn('h-4 w-4 flex-shrink-0', befehlsgeberName ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
            <span className="max-w-[120px] truncate font-medium">{befehlsgeberButtonLabel}</span>
            <PiCaretDown className={cn('h-4 w-4 flex-shrink-0', befehlsgeberName ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          </ListboxButton>

          <ListboxOptions
            transition
            className={cn(
              'absolute z-20 mt-1 max-h-48 w-48 overflow-auto rounded-lg bg-surface-panel py-1 text-sm shadow-lg',
              'border border-border-subtle ring-1 ring-border-subtle/50 focus:outline-none',
              'data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in data-[closed]:data-[leave]:opacity-0 motion-reduce:data-[leave]:duration-0',
            )}
          >
            {/* Leere Option = "Alle" */}
            <ListboxOption
              value=""
              className={cn('relative flex cursor-pointer items-center px-3 py-2 text-text-muted italic select-none', 'data-[focus]:bg-action-secondary data-[focus]:text-text-primary')}
            >
              Alle Befehlsgeber
            </ListboxOption>
            {befehlsgeberOptions.map((name) => (
              <ListboxOption
                key={name}
                value={name}
                className={cn('relative flex cursor-pointer items-center gap-2 px-3 py-2 select-none', 'text-text-primary', 'data-[focus]:bg-action-secondary data-[focus]:text-text-primary')}
              >
                {({ selected }) => <span className={cn('block truncate', selected && 'font-semibold')}>{name}</span>}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>

      {/* Zeitraum: Von / Bis */}
      <div className="flex items-center gap-2">
        <div className={cn('relative flex items-center rounded-lg border text-sm', 'focus-within:shadow-focus-ring', von ? activeClasses : inactiveClasses)}>
          <PiCalendar className={cn('ml-3 h-4 w-4 flex-shrink-0', von ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          <Input
            type="date"
            value={von}
            onChange={(e) => onVonChange(e.target.value)}
            aria-label="Befehle ab Datum"
            className={cn('border-none bg-transparent py-2 pr-3 pl-2 font-medium text-text-secondary focus:outline-none', von && 'text-action-primary')}
          />
        </div>
        <span className="text-xs text-text-muted">–</span>
        <div className={cn('relative flex items-center rounded-lg border text-sm', 'focus-within:shadow-focus-ring', bis ? activeClasses : inactiveClasses)}>
          <PiCalendar className={cn('ml-3 h-4 w-4 flex-shrink-0', bis ? 'text-action-primary' : 'text-text-muted')} aria-hidden="true" />
          <Input
            type="date"
            value={bis}
            onChange={(e) => onBisChange(e.target.value)}
            aria-label="Befehle bis Datum"
            className={cn('border-none bg-transparent py-2 pr-3 pl-2 font-medium text-text-secondary focus:outline-none', bis && 'text-action-primary')}
          />
        </div>
      </div>

      {/* Freitext-Suche */}
      <div className="min-w-[180px] flex-1">
        <Input
          type="text"
          value={localSearch}
          onChange={handleSearchChange}
          placeholder="Suche in Befehlen..."
          aria-label="Befehle durchsuchen"
          leftIcon={<PiMagnifyingGlass className="h-4 w-4" aria-hidden="true" />}
          fullWidth
        />
      </div>

      {/* Filter Badge + Reset */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-action-secondary px-2.5 py-0.5 text-xs font-medium text-action-primary">Filter ({activeFilterCount})</span>
          <button
            type="button"
            onClick={onReset}
            className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium', 'text-text-muted hover:bg-action-secondary hover:text-text-secondary')}
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
