/**
 * Einsatz-Switcher Molecule
 *
 * Dropdown in der Sidebar zur Auswahl des aktiven Einsatzes.
 * Zeigt alle aktiven Einsätze und navigiert bei Wechsel.
 */

import { useActiveEinsaetzeWithCounts } from '@/features/einsatz/api';
import { cn } from '@/shared/ui';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { PiCaretUpDown, PiSiren } from 'react-icons/pi';

/**
 * Sidebar-Dropdown zum Wechseln zwischen aktiven Einsätzen
 */
export function EinsatzSwitcher() {
  const { einsatzId } = useParams({ from: '/app/einsatz/$einsatzId' });
  const navigate = useNavigate();
  const { data: einsaetze = [], isLoading } = useActiveEinsaetzeWithCounts();

  const aktuellerEinsatz = einsaetze.find((e) => e.id === einsatzId);

  if (isLoading) {
    return (
      <div className="mb-4">
        <output className="animate-pulse h-9 bg-gray-700 rounded-lg block" aria-label="Einsatz wird geladen" />
      </div>
    );
  }

  if (einsaetze.length <= 1) {
    return null;
  }

  const handleChange = (newEinsatzId: string) => {
    if (newEinsatzId === einsatzId) return;
    navigate({
      to: '/app/einsatz/$einsatzId/übersicht',
      params: { einsatzId: newEinsatzId },
    });
  };

  return (
    <div className="mb-4">
      <Listbox as="div" value={einsatzId} onChange={handleChange}>
        <ListboxButton
          className={cn(
            'group flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm',
            'hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600',
          )}
          aria-label="Einsatz wechseln"
        >
          <PiSiren className="h-4 w-4 flex-shrink-0 text-red-500" />
          <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-100">{aktuellerEinsatz?.name ?? 'Einsatz wählen'}</span>
          <PiCaretUpDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        </ListboxButton>
        <ListboxOptions
          className={cn('absolute z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg', 'dark:border-gray-600 dark:bg-gray-700')}
          anchor="bottom start"
        >
          {einsaetze.map((einsatz) => (
            <ListboxOption
              key={einsatz.id}
              value={einsatz.id}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                'data-[focus]:bg-blue-50 dark:data-[focus]:bg-blue-900/20',
                'data-[selected]:bg-blue-100 data-[selected]:font-medium dark:data-[selected]:bg-blue-900/30',
              )}
            >
              <PiSiren className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-gray-900 dark:text-gray-100">{einsatz.name}</div>
                {einsatz.alarmstichwort && <div className="truncate text-gray-500 text-xs dark:text-gray-400">{einsatz.alarmstichwort}</div>}
              </div>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
