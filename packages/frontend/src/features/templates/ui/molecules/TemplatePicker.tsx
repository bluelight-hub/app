/**
 * TemplatePicker Molecule
 *
 * **Story 6.3 AC1:** Vorlage-Auswahl im Quick-Create Dialog.
 * **Story 6.3 AC4:** Leere Vorlagen-Liste mit Hinweis.
 *
 * Dropdown-Button der verfuegbare Vorlagen anzeigt und bei Auswahl
 * die Vorlage-Daten an den Parent weitergibt.
 */

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { PiClipboardText, PiClock, PiSpinner } from 'react-icons/pi';
import { Link } from '@tanstack/react-router';

import type { ErinnerungsvorlageResponseDto } from '@/shared';
import { cn } from '@/shared/ui/cn';

interface TemplatePickerProps {
  /** Verfuegbare Vorlagen */
  vorlagen: ErinnerungsvorlageResponseDto[];
  /** Wird geladen */
  isLoading: boolean;
  /** Callback bei Vorlage-Auswahl */
  onSelect: (vorlage: ErinnerungsvorlageResponseDto) => void;
  /** Deaktiviert den Picker (z.B. waehrend Submit) */
  disabled?: boolean;
}

/**
 * Dropdown-Auswahl fuer Erinnerungsvorlagen im Quick-Create Dialog.
 */
export function TemplatePicker({ vorlagen, isLoading, onSelect, disabled }: TemplatePickerProps) {
  return (
    <Listbox as="div" value={null} onChange={onSelect}>
      <ListboxButton
        disabled={disabled || isLoading}
        className={cn(
          'flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2 text-sm transition-colors',
          'hover:border-amber-400 hover:bg-amber-50 dark:border-gray-600 dark:hover:border-amber-500 dark:hover:bg-amber-900/10',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isLoading ? <PiSpinner className="h-4 w-4 animate-spin text-gray-400" /> : <PiClipboardText className="h-4 w-4 text-gray-500 dark:text-gray-400" />}
        <span className="font-medium text-gray-600 dark:text-gray-300">Aus Vorlage</span>
      </ListboxButton>

      <ListboxOptions
        anchor="bottom start"
        className={cn(
          'z-50 mt-1 w-72 origin-top-left rounded-lg border border-gray-200 bg-white shadow-lg',
          'focus:outline-none dark:border-gray-700 dark:bg-gray-800',
          'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
        )}
      >
        <div className="p-1">
          {vorlagen.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-gray-500 text-sm dark:text-gray-400">Keine Vorlagen vorhanden</p>
              <Link to="/admin/erinnerungen" className="mt-2 inline-block font-medium text-amber-600 text-xs hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
                Vorlagen erstellen →
              </Link>
            </div>
          ) : (
            vorlagen.map((vorlage) => (
              <ListboxOption
                key={vorlage.id}
                value={vorlage}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                  'data-[focus]:bg-amber-50 dark:data-[focus]:bg-amber-900/20',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 text-sm dark:text-white">{vorlage.titel}</p>
                  {vorlage.beschreibung && <p className="mt-0.5 truncate text-gray-500 text-xs dark:text-gray-400">{vorlage.beschreibung}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/30">
                  <PiClock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-700 text-xs dark:text-amber-300">{vorlage.minuten} Min</span>
                </div>
              </ListboxOption>
            ))
          )}
        </div>
      </ListboxOptions>
    </Listbox>
  );
}
