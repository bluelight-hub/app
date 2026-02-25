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

  /** Empfaenger hinzufuegen */
  const addEmpfaenger = (selection: EmpfaengerSelection) => {
    if (!value.some((v) => v.name.toLowerCase() === selection.name.toLowerCase())) {
      onChange([...value, selection]);
    }
    setQuery('');
    inputRef.current?.focus();
  };

  /** Empfaenger entfernen */
  const removeEmpfaenger = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  /** Backspace in leerer Eingabe entfernt letzten Chip */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !query && value.length > 0) {
      removeEmpfaenger(value.length - 1);
    }
  };

  return (
    <div>
      {/* Chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((chip, index) => (
            <span
              key={chip.empfaengerId ?? `manual-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {chip.empfaengerId && <PiLink className="h-3 w-3 text-blue-400" aria-hidden="true" />}
              {chip.name}
              <button
                type="button"
                onClick={() => removeEmpfaenger(index)}
                className="ml-0.5 inline-flex items-center rounded-full p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600 dark:text-blue-400 dark:hover:bg-blue-800 dark:hover:text-blue-200"
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
              'block w-full rounded-lg border-2 bg-gray-50 px-4 py-3 font-medium text-base text-gray-900',
              'transition-all duration-200',
              'border-gray-200',
              'placeholder:text-gray-400',
              'focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-20',
              'sm:text-sm/6',
              'dark:border-gray-700 dark:bg-gray-900 dark:text-white',
              'dark:focus:border-primary-400 dark:focus:bg-gray-800 dark:focus:ring-primary-400 dark:placeholder:text-gray-500',
              error && 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-400 dark:focus:ring-red-400',
            )}
            autoCorrect="off"
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder={value.length === 0 ? 'Empfänger suchen...' : 'Weiteren Empfänger hinzufügen...'}
            displayValue={() => query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Dropdown - Headless UI managed */}
          <ComboboxOptions
            className={cn(
              'absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg',
              'border border-gray-200',
              'empty:hidden',
              'sm:text-sm',
              'dark:border-gray-700 dark:bg-gray-800 dark:shadow-none',
            )}
          >
            {/* Hinweis: Mind. 2 Zeichen */}
            {query.length > 0 && query.length < 2 && <div className="px-3 py-2 text-gray-500 text-sm dark:text-gray-400">Mind. 2 Zeichen für Vorschläge</div>}

            {/* Ladeanzeige */}
            {isFetching && debouncedQuery.length >= 2 && <div className="px-3 py-2 text-gray-500 text-sm dark:text-gray-400">Suche läuft...</div>}

            {/* API-Ergebnisse */}
            {filteredResults.map((result) => (
              <ComboboxOption
                key={result.id}
                value={{ name: result.name, empfaengerId: result.userId } satisfies EmpfaengerSelection}
                className={cn(
                  'group cursor-default select-none px-3 py-2 text-gray-900',
                  'data-[focus]:bg-primary-600 data-[focus]:text-white data-[focus]:outline-none',
                  'dark:text-gray-300 dark:data-[focus]:bg-primary-500',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="block truncate">{result.name}</span>
                  {result.rolle && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 group-data-[focus]:bg-primary-700 group-data-[focus]:text-primary-100 dark:bg-gray-700 dark:text-gray-300">
                      {result.rolle}
                    </span>
                  )}
                  {result.userId && <PiLink className="h-3.5 w-3.5 shrink-0 text-gray-400 group-data-[focus]:text-white" aria-label="Verknüpfter Benutzer" />}
                </div>
              </ComboboxOption>
            ))}

            {/* Alle bereits ausgewaehlt */}
            {debouncedQuery.length >= 2 && !isFetching && results && results.length > 0 && filteredResults.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-sm dark:text-gray-400">Alle Treffer bereits ausgewählt</div>
            )}

            {/* Keine Treffer Hinweis */}
            {debouncedQuery.length >= 2 && !isFetching && results && results.length === 0 && <div className="px-3 py-2 text-gray-500 text-sm dark:text-gray-400">Keine Treffer gefunden</div>}

            {/* Freitext-Option - immer verfuegbar wenn Query vorhanden */}
            {showFreetextOption && (
              <ComboboxOption
                value={{ name: trimmedQuery } satisfies EmpfaengerSelection}
                className={cn(
                  'group cursor-default select-none border-t border-gray-100 px-3 py-2 text-gray-900',
                  'data-[focus]:bg-primary-600 data-[focus]:text-white data-[focus]:outline-none',
                  'dark:border-gray-700 dark:text-gray-300 dark:data-[focus]:bg-primary-500',
                )}
              >
                <div className="flex items-center gap-2">
                  <PiPlus className="h-3.5 w-3.5 shrink-0 text-gray-400 group-data-[focus]:text-white" aria-hidden="true" />
                  <span className="block truncate">„{trimmedQuery}" als Freitext hinzufügen</span>
                </div>
              </ComboboxOption>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      {/* Error-Hinweis */}
      {isError && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Manuelle Eingabe möglich</p>}
    </div>
  );
}
