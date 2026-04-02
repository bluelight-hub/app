/**
 * Dropdown zur Zuweisung eines Fahrzeugs zu einer taktischen Einheit.
 *
 * Zeigt alle Einheiten des Einsatzes mit Name und Typ-Badge.
 * Erste Option ermöglicht Entfernung der Zuweisung.
 */

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiTreeStructure, PiCheck, PiCaretUpDown } from 'react-icons/pi';
import { EinheitTypBadge } from './EinheitTypBadge';
import { cn } from '@/shared/ui/cn';

interface EinheitZuweisungsDropdownProps {
  /** Aktuell zugewiesene Einheit-ID (null = keine Zuweisung) */
  currentEinheitId?: string | null;
  /** Liste verfügbarer Einheiten des Einsatzes */
  einheiten: Array<{ id: string; name: string; typ: string }>;
  /** Callback bei Zuweisung (null = Zuweisung entfernen) */
  onAssign: (einheitId: string | null) => void;
  /** Loading State während API-Call */
  isLoading?: boolean;
  /** Dropdown deaktivieren */
  disabled?: boolean;
}

/**
 * Dropdown zur Zuweisung eines Fahrzeugs zu einer taktischen Einheit.
 *
 * Zeigt alle Einheiten des Einsatzes mit Name und EinheitTypBadge.
 * Erste Option ermöglicht Entfernung der Zuweisung.
 *
 * @example
 * ```tsx
 * <EinheitZuweisungsDropdown
 *   currentEinheitId={fahrzeug.einheitId}
 *   einheiten={einsatzEinheiten}
 *   onAssign={(id) => assignToEinheit({ fahrzeugId: fahrzeug.id, einheitId: id })}
 * />
 * ```
 */
export function EinheitZuweisungsDropdown({ currentEinheitId, einheiten, onAssign, isLoading = false, disabled = false }: EinheitZuweisungsDropdownProps) {
  const currentEinheit = currentEinheitId ? einheiten.find((e) => e.id === currentEinheitId) : null;

  const buttonLabel = isLoading ? '...' : currentEinheit ? currentEinheit.name : 'Zuweisen';

  const buttonClasses = cn(
    'relative w-full cursor-pointer rounded-lg py-2 pr-10 pl-3 text-left shadow-sm ring-1 ring-inset focus-visible:shadow-focus-ring focus-visible:outline-none sm:text-sm',
    currentEinheit ? 'bg-status-success-surface text-status-success-text ring-status-success-border' : 'bg-surface-raised text-text-secondary ring-border-subtle',
    (disabled || isLoading) && 'cursor-not-allowed opacity-50',
  );

  return (
    <Listbox as="div" value={currentEinheitId ?? null} onChange={onAssign} disabled={disabled || isLoading}>
      <div>
        <ListboxButton className={buttonClasses} aria-label={`Einheit: ${buttonLabel}`}>
          <span className="flex items-center gap-2 truncate font-medium">
            <PiTreeStructure className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {buttonLabel}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <PiCaretUpDown className="h-5 w-5 text-text-muted" aria-hidden="true" />
          </span>
        </ListboxButton>

        <ListboxOptions
          anchor="bottom end"
          transition
          className="z-[100] max-h-60 w-[var(--button-width)] overflow-auto rounded-md border border-border-subtle bg-surface-panel py-1 text-base shadow-panel transition duration-100 ease-in [--anchor-gap:4px] focus-visible:outline-none data-[closed]:opacity-0 sm:text-sm"
        >
          {/* Erste Option: Zuweisung entfernen */}
          <ListboxOption value={null} className={({ focus }) => cn('relative cursor-pointer py-2 pr-4 pl-10 text-text-secondary select-none', focus ? 'bg-action-secondary' : '')}>
            {({ selected }) => (
              <>
                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>Keine Einheit</span>
                {selected && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <PiCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </>
            )}
          </ListboxOption>

          {/* Einheit-Optionen */}
          {einheiten.map((einheit) => (
            <ListboxOption key={einheit.id} value={einheit.id} className={({ focus }) => cn('relative cursor-pointer py-2 pr-4 pl-10 select-none', focus ? 'bg-action-secondary' : '')}>
              {({ selected }) => (
                <>
                  <span className={`flex items-center gap-2 truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    <PiTreeStructure className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
                    <span>{einheit.name}</span>
                    <EinheitTypBadge typ={einheit.typ} />
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-status-success-text">
                      <PiCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
