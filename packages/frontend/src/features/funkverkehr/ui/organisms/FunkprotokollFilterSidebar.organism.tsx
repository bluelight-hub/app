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
              return (
                <li key={kanal.id}>
                  <label className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={checked} onChange={() => toggleKanal(kanal.id)} aria-label={`Kanal ${kanal.name}`} />
                    <span className="truncate">{kanal.name}</span>
                  </label>
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
            return (
              <li key={option.value}>
                <label className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={checked} onChange={() => togglePrio(option.value)} aria-label={option.label} />
                  <span>{option.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="filter-zeit" className="space-y-2">
        <h3 id="filter-zeit" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Zeitraum
        </h3>
        <label className="block text-xs">
          <span>Von</span>
          <input
            type="datetime-local"
            value={filter.vonDate ?? ''}
            onChange={(event) => setFilterForEinsatz(einsatzId, { vonDate: event.target.value || undefined })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="block text-xs">
          <span>Bis</span>
          <input
            type="datetime-local"
            value={filter.bisDate ?? ''}
            onChange={(event) => setFilterForEinsatz(einsatzId, { bisDate: event.target.value || undefined })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
      </section>

      <section aria-labelledby="filter-absender" className="space-y-2">
        <h3 id="filter-absender" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Absender
        </h3>
        <input
          type="text"
          value={filter.absenderQuery ?? ''}
          onChange={(event) => setFilterForEinsatz(einsatzId, { absenderQuery: event.target.value || undefined })}
          placeholder="Rufname eingeben…"
          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Absender-Filter"
        />
      </section>

      <section aria-labelledby="filter-volltext" className="space-y-2">
        <h3 id="filter-volltext" className="text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
          Volltextsuche
        </h3>
        <input
          type="search"
          value={volltextInput}
          onChange={(event) => setVolltextInput(event.target.value)}
          placeholder="Nachricht suchen…"
          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Volltext-Filter"
        />
      </section>
    </aside>
  );
}
