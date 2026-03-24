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
        <output className="block h-9 animate-pulse rounded-lg bg-surface-raised" aria-label="Einsatz wird geladen" />
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
            'group flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-left text-sm',
            'hover:bg-action-secondary',
            'focus-visible:outline-none focus-visible:shadow-focus-ring',
          )}
          aria-label="Einsatz wechseln"
        >
          <PiSiren className="h-4 w-4 flex-shrink-0 text-status-danger-text" />
          <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{aktuellerEinsatz?.name ?? 'Einsatz wählen'}</span>
          <PiCaretUpDown className="h-4 w-4 flex-shrink-0 text-text-muted" />
        </ListboxButton>
        <ListboxOptions
          className={cn('absolute z-50 mt-1 max-h-60 w-[var(--button-width)] overflow-auto rounded-lg border border-border-subtle bg-surface-panel shadow-panel', 'focus-visible:outline-none')}
          anchor="bottom start"
        >
          {einsaetze.map((einsatz) => (
            <ListboxOption
              key={einsatz.id}
              value={einsatz.id}
              className={cn('flex cursor-pointer items-center gap-2 px-3 py-2 text-sm', 'data-[focus]:bg-action-secondary', 'data-[selected]:bg-action-secondary data-[selected]:font-medium')}
            >
              <PiSiren className="h-3.5 w-3.5 flex-shrink-0 text-status-danger-text" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-text-primary">{einsatz.name}</div>
                {einsatz.alarmstichwort && <div className="truncate text-body-xs text-text-secondary">{einsatz.alarmstichwort}</div>}
              </div>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
