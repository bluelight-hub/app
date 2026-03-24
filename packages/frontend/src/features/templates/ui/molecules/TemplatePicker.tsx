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
          'flex items-center gap-2 rounded-panel border-2 border-dashed border-border-subtle px-3 py-2 text-sm transition-colors',
          'hover:border-status-warning-text hover:bg-status-warning-surface',
          'focus:outline-none focus-visible:shadow-focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isLoading ? <PiSpinner className="h-4 w-4 animate-spin text-text-muted" /> : <PiClipboardText className="h-4 w-4 text-text-muted" />}
        <span className="font-medium text-text-secondary">Aus Vorlage</span>
      </ListboxButton>

      <ListboxOptions
        anchor="bottom start"
        className={cn(
          'z-50 mt-1 w-72 origin-top-left rounded-panel border border-border-subtle bg-surface-panel shadow-panel',
          'focus:outline-none',
          'transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0',
        )}
      >
        <div className="p-1">
          {vorlagen.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-text-muted text-sm">Keine Vorlagen vorhanden</p>
              <Link to="/admin/erinnerungen" className="mt-2 inline-block font-medium text-status-warning-text text-xs hover:text-status-warning-text">
                Vorlagen erstellen →
              </Link>
            </div>
          ) : (
            vorlagen.map((vorlage) => (
              <ListboxOption
                key={vorlage.id}
                value={vorlage}
                className={cn('flex w-full cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left transition-colors', 'data-[focus]:bg-status-warning-surface')}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary text-sm">{vorlage.titel}</p>
                  {vorlage.beschreibung && <p className="mt-0.5 truncate text-text-muted text-xs">{vorlage.beschreibung}</p>}
                </div>
                <div className="flex flex-shrink-0 items-center gap-1 rounded-pill bg-status-warning-surface px-2 py-0.5">
                  <PiClock className="h-3 w-3 text-status-warning-text" />
                  <span className="font-medium text-status-warning-text text-xs">{vorlage.minuten} Min</span>
                </div>
              </ListboxOption>
            ))
          )}
        </div>
      </ListboxOptions>
    </Listbox>
  );
}
