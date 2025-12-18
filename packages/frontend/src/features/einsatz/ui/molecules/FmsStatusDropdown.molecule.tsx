import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { FMS_STATUS_LABELS, FMS_STATUS_OPTIONS, getStatusBgClasses, getStatusClasses, type FmsStatus } from '../../constants/fms-status.constants';

interface FmsStatusDropdownProps {
  /** Aktueller FMS-Status */
  value: FmsStatus;
  /** Callback bei Status-Änderung */
  onChange: (status: FmsStatus) => void;
  /** Dropdown deaktivieren */
  disabled?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

/**
 * Dropdown zur Auswahl eines FMS-Status (0-9).
 *
 * Verwendet Headless UI Listbox für Accessibility.
 * Keyboard-Navigation: Pfeiltasten, Enter, Escape.
 *
 * @example
 * ```tsx
 * <FmsStatusDropdown
 *   value={fahrzeug.fmsStatus}
 *   onChange={(status) => updateFmsStatus({ fahrzeugId: fahrzeug.id, fmsStatus: status })}
 * />
 * ```
 */
export function FmsStatusDropdown({ value, onChange, disabled = false, className = '' }: FmsStatusDropdownProps) {
  const selectedLabel = FMS_STATUS_LABELS[value] ?? `Status ${value}`;

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        <Listbox.Button
          className={`relative w-full cursor-pointer rounded-lg py-2 pr-10 pl-3 text-left shadow-sm ring-1 ring-gray-300 ring-inset focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm ${getStatusClasses(value)} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          aria-label={`FMS-Status: ${selectedLabel}`}
        >
          <span className="block truncate font-medium">
            {value} - {selectedLabel}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>

        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm dark:bg-gray-800 dark:text-gray-100">
            {FMS_STATUS_OPTIONS.map((status) => (
              <Listbox.Option
                key={status}
                value={status}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pr-4 pl-10 ${active ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${getStatusBgClasses(status)}`} aria-hidden="true" />
                      {status} - {FMS_STATUS_LABELS[status] ?? `Status ${status}`}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
