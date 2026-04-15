/**
 * FunkprotokollFilterSidebar
 *
 * Seitenleiste mit sämtlichen Filtern für das Funkprotokoll. Liest und
 * schreibt direkt über den `funkprotokollFilterStore` (pro Einsatz-ID
 * persistiert), damit Filter zwischen Tab-Wechseln erhalten bleiben.
 */

import {
  DEFAULT_FILTER,
  funkprotokollFilterStore,
  getFilterForEinsatz,
  resetFilterForEinsatz,
  setFilterForEinsatz,
  type FunkPrioritaetFilter,
} from '@/features/funkverkehr/stores/funkprotokoll-filter.store';
import { useKanalplan } from '@/features/funkverkehr/api';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Checkbox } from '@/shared/ui/atoms/checkbox.atom';
import { FormField } from '@/shared/ui/atoms/form-field.atom';
import { Input } from '@/shared/ui/atoms/input.atom';
import { cn } from '@/shared/ui/cn';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface FunkprotokollFilterSidebarProps {
  einsatzId: string;
  className?: string;
}

const PRIO_OPTIONS: { value: FunkPrioritaetFilter; label: string }[] = [
  { value: 'routine', label: 'Routine' },
  { value: 'prioritaet', label: 'Priorität' },
  { value: 'notfall', label: 'Notfall' },
];

export function FunkprotokollFilterSidebar({ einsatzId, className }: FunkprotokollFilterSidebarProps) {
  const filter = useStore(funkprotokollFilterStore, (s) => s.byEinsatz[einsatzId] ?? DEFAULT_FILTER);
  const { data: kanalplan } = useKanalplan({ einsatzId, includeArchived: true });
  const kanaele = useMemo(() => kanalplan?.data ?? [], [kanalplan]);

  const [volltextInput, setVolltextInput] = useState(filter.volltextQuery ?? '');

  // Debounced Volltext-Schreiben (250 ms).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilterForEinsatz(einsatzId, { volltextQuery: volltextInput.trim() || undefined });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [einsatzId, volltextInput]);

  useEffect(() => {
    if (filter.volltextQuery !== volltextInput) {
      setVolltextInput(filter.volltextQuery ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.volltextQuery]);

  const toggleKanal = useCallback(
    (kanalId: string) => {
      const current = getFilterForEinsatz(einsatzId).kanalIds;
      const next = current.includes(kanalId) ? current.filter((id) => id !== kanalId) : [...current, kanalId];
      setFilterForEinsatz(einsatzId, { kanalIds: next });
    },
    [einsatzId],
  );

  const togglePrio = useCallback(
    (prio: FunkPrioritaetFilter) => {
      const current = getFilterForEinsatz(einsatzId).prioritaeten;
      const next = current.includes(prio) ? current.filter((p) => p !== prio) : [...current, prio];
      setFilterForEinsatz(einsatzId, { prioritaeten: next });
    },
    [einsatzId],
  );

  return (
    <aside aria-label="Funkprotokoll-Filter" className={cn('w-[280px] shrink-0 space-y-5 border-r border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Filter</h2>
        <Button intent="secondary" appearance="ghost" size="sm" onClick={() => resetFilterForEinsatz(einsatzId)} type="button">
          Zurücksetzen
        </Button>
      </header>

      <section aria-labelledby="filter-kanal" className="space-y-2">
        <h3 id="filter-kanal" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Kanäle
        </h3>
        {kanaele.length === 0 ? (
          <p className="text-xs text-slate-500">Keine Kanäle angelegt.</p>
        ) : (
          <ul role="list" className="max-h-48 overflow-auto">
            {kanaele.map((kanal) => {
              const checked = filter.kanalIds.includes(kanal.id);
              const id = `funkprotokoll-filter-kanal-${kanal.id}`;
              return (
                <li key={kanal.id}>
                  <Checkbox id={id} checked={checked} onChange={() => toggleKanal(kanal.id)} containerClassName="flex py-1" labelClassName="truncate" label={kanal.name} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="filter-prio" className="space-y-2">
        <h3 id="filter-prio" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Priorität
        </h3>
        <ul role="list">
          {PRIO_OPTIONS.map((option) => {
            const checked = filter.prioritaeten.includes(option.value);
            const id = `funkprotokoll-filter-prio-${option.value}`;
            return (
              <li key={option.value}>
                <Checkbox id={id} checked={checked} onChange={() => togglePrio(option.value)} containerClassName="flex py-1" label={option.label} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="filter-zeit" className="space-y-2">
        <h3 id="filter-zeit" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Zeitraum
        </h3>
        <FormField label="Von" htmlFor="funkprotokoll-filter-von" className="space-y-1">
          <Input id="funkprotokoll-filter-von" type="datetime-local" value={filter.vonDate ?? ''} onChange={(event) => setFilterForEinsatz(einsatzId, { vonDate: event.target.value || undefined })} />
        </FormField>
        <FormField label="Bis" htmlFor="funkprotokoll-filter-bis" className="space-y-1">
          <Input id="funkprotokoll-filter-bis" type="datetime-local" value={filter.bisDate ?? ''} onChange={(event) => setFilterForEinsatz(einsatzId, { bisDate: event.target.value || undefined })} />
        </FormField>
      </section>

      <section aria-labelledby="filter-absender" className="space-y-2">
        <h3 id="filter-absender" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Absender
        </h3>
        <Input
          type="text"
          value={filter.absenderQuery ?? ''}
          onChange={(event) => setFilterForEinsatz(einsatzId, { absenderQuery: event.target.value || undefined })}
          placeholder="Rufname eingeben…"
          aria-label="Absender-Filter"
        />
      </section>

      <section aria-labelledby="filter-volltext" className="space-y-2">
        <h3 id="filter-volltext" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Volltextsuche
        </h3>
        <Input type="search" value={volltextInput} onChange={(event) => setVolltextInput(event.target.value)} placeholder="Nachricht suchen…" aria-label="Volltext-Filter" />
      </section>
    </aside>
  );
}
