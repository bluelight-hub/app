import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiTruck, PiCheck, PiCaretUpDown } from 'react-icons/pi';
import { FmsStatusBadge } from '@/features/einsatz';
import { cn } from '@/shared/ui/cn';

interface FahrzeugZuweisungsDropdownProps {
  /** Aktuell zugewiesene Fahrzeug-ID (null = keine Zuweisung) */
  currentFahrzeugId?: string | null;
  /** Liste verfügbarer Fahrzeuge des Einsatzes */
  fahrzeuge: Array<{ id: string; funkrufname: string; fmsStatus: number }>;
  /** Callback bei Zuweisung (null = Zuweisung entfernen) */
  onAssign: (fahrzeugId: string | null) => void;
  /** Loading State während API-Call */
  isLoading?: boolean;
  /** Dropdown deaktivieren */
  disabled?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Dropdown zur Zuweisung einer Person zu einem Fahrzeug.
 *
 * Zeigt alle Fahrzeuge des Einsatzes mit Funkrufname und FMS-Status.
 * Erste Option ermöglicht Entfernung der Zuweisung.
 *
 * @example
 * ```tsx
 * <FahrzeugZuweisungsDropdown
 *   currentFahrzeugId={person.fahrzeugId}
 *   fahrzeuge={einsatzFahrzeuge}
 *   onAssign={(id) => updatePersonFahrzeug({ personId: person.id, fahrzeugId: id })}
 * />
 * ```
 */
export function FahrzeugZuweisungsDropdown({ currentFahrzeugId, fahrzeuge, onAssign, isLoading = false, disabled = false, className = '' }: FahrzeugZuweisungsDropdownProps) {
  const currentFahrzeug = currentFahrzeugId ? fahrzeuge.find((f) => f.id === currentFahrzeugId) : null;

  const buttonLabel = isLoading ? '...' : currentFahrzeug ? currentFahrzeug.funkrufname : 'Zuweisen';

  const buttonClasses = cn(
    'relative w-full cursor-pointer rounded-lg py-2 pr-10 pl-3 text-left shadow-sm ring-1 ring-inset focus-visible:shadow-focus-ring focus-visible:outline-none sm:text-sm',
    currentFahrzeug ? 'bg-status-info-surface text-status-info-text ring-status-info-border' : 'bg-surface-raised text-text-secondary ring-border-subtle',
    (disabled || isLoading) && 'cursor-not-allowed opacity-50',
  );

  return (
    <Listbox as="div" value={currentFahrzeugId ?? null} onChange={onAssign} disabled={disabled || isLoading}>
      <div className={cn(className)}>
        <ListboxButton className={buttonClasses} aria-label={`Fahrzeug: ${buttonLabel}`}>
          <span className="flex items-center gap-2 truncate font-medium">
            <PiTruck className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
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
                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>Keine Zuweisung</span>
                {selected && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <PiCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </>
            )}
          </ListboxOption>

          {/* Fahrzeug-Optionen */}
          {fahrzeuge.map((fahrzeug) => (
            <ListboxOption key={fahrzeug.id} value={fahrzeug.id} className={({ focus }) => cn('relative cursor-pointer py-2 pr-4 pl-10 select-none', focus ? 'bg-action-secondary' : '')}>
              {({ selected }) => (
                <>
                  <span className={`flex items-center gap-2 truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                    <PiTruck className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
                    <span>{fahrzeug.funkrufname}</span>
                    <FmsStatusBadge status={fahrzeug.fmsStatus} />
                  </span>
                  {selected && (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-status-info-text">
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
