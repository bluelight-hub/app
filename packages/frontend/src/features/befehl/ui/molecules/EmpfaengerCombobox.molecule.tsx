/**
 * EmpfaengerCombobox - Multi-Select Combobox mit API-gestuetzter Empfaenger-Suche
 *
 * Durchsucht EinsatzPersonen und StammPersonen via Backend-Endpoint.
 * Unterstuetzt Multi-Select mit Chips, Freitext-Eingabe und Error-Fallback.
 * Nutzt Headless UI Combobox fuer korrektes Dropdown-Management.
 */

import { cn } from '@/shared/ui/cn';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';
import { PiLink, PiPlus, PiX } from 'react-icons/pi';
import { useEmpfaengerSuche } from '../../api/use-empfaenger-suche';

export interface EmpfaengerSelection {
  name: string;
  empfaengerId?: string;
}

interface EmpfaengerComboboxProps {
  einsatzId: string;
  value: EmpfaengerSelection[];
  onChange: (empfaenger: EmpfaengerSelection[]) => void;
  error?: string;
}

/** Debounce Hook fuer die Suche */
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function EmpfaengerCombobox({ einsatzId, value, onChange, error }: EmpfaengerComboboxProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isError, isFetching } = useEmpfaengerSuche(einsatzId, debouncedQuery);

  /** Bereits ausgewaehlte IDs/Namen filtern */
  const filteredResults = (results ?? []).filter((r) => !value.some((v) => v.name.toLowerCase() === r.name.toLowerCase() || (v.empfaengerId && v.empfaengerId === r.id)));

  const trimmedQuery = query.trim();

  /** Freitext-Option anzeigen wenn Query vorhanden und nicht schon ausgewaehlt/in Ergebnissen */
  const showFreetextOption =
    trimmedQuery.length > 0 && !value.some((v) => v.name.toLowerCase() === trimmedQuery.toLowerCase()) && !filteredResults.some((r) => r.name.toLowerCase() === trimmedQuery.toLowerCase());

  const isDuplicate = (selection: EmpfaengerSelection, current: EmpfaengerSelection[]) =>
    current.some((existing) => {
      if (selection.empfaengerId && existing.empfaengerId) {
        return selection.empfaengerId === existing.empfaengerId;
      }
      return existing.name.toLowerCase() === selection.name.toLowerCase();
    });

  const addMultipleEmpfaenger = (selections: EmpfaengerSelection[], options: { refocus?: boolean } = {}) => {
    if (selections.length === 0) return;
    const next = [...value];

    for (const selection of selections) {
      if (!isDuplicate(selection, next)) {
        next.push(selection);
      }
    }

    if (next.length !== value.length) {
      onChange(next);
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setQuery('');
    if (options.refocus ?? true) {
      inputRef.current?.focus();
    }
  };

  const parseFreitextSelections = (rawValue: string): EmpfaengerSelection[] =>
    rawValue
      .split(/[,\n;]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((name) => ({ name }));

  /** Empfaenger hinzufuegen */
  const addEmpfaenger = (selection: EmpfaengerSelection, options: { refocus?: boolean } = {}) => {
    addMultipleEmpfaenger([selection], options);
  };

  /** Empfaenger entfernen */
  const removeEmpfaenger = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  /** Backspace in leerer Eingabe entfernt letzten Chip */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !query && value.length > 0) {
      removeEmpfaenger(value.length - 1);
      return;
    }

    if (showFreetextOption && e.key === ',') {
      e.preventDefault();
      addMultipleEmpfaenger(parseFreitextSelections(query));
      return;
    }

    if (trimmedQuery.length > 0 && e.key === ';') {
      e.preventDefault();
      addMultipleEmpfaenger(parseFreitextSelections(query));
      return;
    }

    if (showFreetextOption && e.key === 'Tab') {
      addEmpfaenger({ name: trimmedQuery }, { refocus: false });
      return;
    }

    if (trimmedQuery.length > 0 && /[,\n;]/.test(query) && e.key === 'Enter') {
      e.preventDefault();
      addMultipleEmpfaenger(parseFreitextSelections(query));
      return;
    }

    if (showFreetextOption && e.key === 'Enter' && filteredResults.length === 0 && !isFetching) {
      e.preventDefault();
      addEmpfaenger({ name: trimmedQuery });
    }
  };

  return (
    <div>
      {/* Chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((chip, index) => (
            <span key={chip.empfaengerId ?? `manual-${index}`} className="inline-flex items-center gap-1 rounded-full bg-status-info-surface px-2.5 py-0.5 text-sm font-medium text-status-info-text">
              {chip.empfaengerId && <PiLink className="h-3 w-3 text-status-info-text" aria-hidden="true" />}
              {chip.name}
              <button
                type="button"
                onClick={() => removeEmpfaenger(index)}
                className="ml-0.5 inline-flex items-center rounded-full p-0.5 text-status-info-text hover:bg-status-info-surface hover:text-action-primary"
                aria-label={`${chip.name} entfernen`}
              >
                <PiX className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Combobox
        value={null}
        onChange={(selected: EmpfaengerSelection | null) => {
          if (selected) addEmpfaenger(selected);
        }}
      >
        <div className="relative">
          <ComboboxInput
            ref={inputRef}
            aria-label="Empfänger suchen"
            className={cn(
              'block w-full rounded-lg border bg-surface-raised px-4 py-3 text-base font-medium text-text-primary',
              'transition-all duration-200',
              'border-border-subtle',
              'placeholder:text-text-muted',
              'focus:border-action-primary focus:bg-surface-panel focus:outline-none focus-visible:shadow-focus-ring',
              'sm:text-sm/6',
              error && 'border-status-danger-border focus:border-status-danger-text focus-visible:shadow-focus-ring',
            )}
            autoCorrect="off"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={value.length === 0 ? 'Empfänger suchen...' : 'Weiteren Empfänger hinzufügen...'}
            displayValue={() => query}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (!pasted || !/[,\n;]/.test(pasted)) return;

              e.preventDefault();
              addMultipleEmpfaenger(parseFreitextSelections(pasted));
            }}
            onKeyDown={handleKeyDown}
          />

          {/* Dropdown - Headless UI managed */}
          <ComboboxOptions
            className={cn('absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-surface-panel py-1 text-base shadow-lg', 'border border-border-subtle', 'empty:hidden', 'sm:text-sm')}
          >
            {/* Hinweis: Mind. 2 Zeichen */}
            {query.length > 0 && query.length < 2 && <div className="px-3 py-2 text-sm text-text-muted">Mind. 2 Zeichen für Vorschläge</div>}

            {/* Ladeanzeige */}
            {isFetching && debouncedQuery.length >= 2 && <div className="px-3 py-2 text-sm text-text-muted">Suche läuft...</div>}

            {/* API-Ergebnisse */}
            {filteredResults.map((result) => (
              <ComboboxOption
                key={result.id}
                value={{ name: result.name, empfaengerId: result.userId } satisfies EmpfaengerSelection}
                className={cn('group cursor-default px-3 py-2 text-text-primary select-none', 'data-[focus]:bg-action-primary data-[focus]:text-text-inverse data-[focus]:outline-none')}
              >
                <div className="flex items-center gap-2">
                  <span className="block truncate">{result.name}</span>
                  {result.rolle && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-secondary group-data-[focus]:bg-action-primary-hover group-data-[focus]:text-text-inverse">
                      {result.rolle}
                    </span>
                  )}
                  {result.userId && <PiLink className="h-3.5 w-3.5 shrink-0 text-text-muted group-data-[focus]:text-text-inverse" aria-label="Verknüpfter Benutzer" />}
                </div>
              </ComboboxOption>
            ))}

            {/* Alle bereits ausgewaehlt */}
            {debouncedQuery.length >= 2 && !isFetching && results && results.length > 0 && filteredResults.length === 0 && (
              <div className="px-3 py-2 text-sm text-text-muted">Alle Treffer bereits ausgewählt</div>
            )}

            {/* Keine Treffer Hinweis */}
            {debouncedQuery.length >= 2 && !isFetching && results && results.length === 0 && <div className="px-3 py-2 text-sm text-text-muted">Keine Treffer gefunden</div>}

            {/* Freitext-Option - immer verfuegbar wenn Query vorhanden */}
            {showFreetextOption && (
              <ComboboxOption
                value={{ name: trimmedQuery } satisfies EmpfaengerSelection}
                className={cn(
                  'group cursor-default border-t border-border-subtle px-3 py-2 text-text-primary select-none',
                  'data-[focus]:bg-action-primary data-[focus]:text-text-inverse data-[focus]:outline-none',
                )}
              >
                <div className="flex items-center gap-2">
                  <PiPlus className="h-3.5 w-3.5 shrink-0 text-text-muted group-data-[focus]:text-text-inverse" aria-hidden="true" />
                  <span className="block truncate">„{trimmedQuery}" als Freitext hinzufügen</span>
                </div>
              </ComboboxOption>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      {/* Error-Hinweis */}
      {isError && <p className="mt-1.5 text-xs text-text-muted">Manuelle Eingabe möglich</p>}
    </div>
  );
}
