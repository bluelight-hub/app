/**
 * Funkprotokoll-Filter-Store
 *
 * Speichert pro Einsatz-ID die UI-Filterwerte (Kanal, Priorität, Zeitraum,
 * Absender/Volltext, Darstellungsdichte) für das Funkprotokoll.
 */

import { createStore } from '@tanstack/react-store';

export type DichteMode = 'bubbles' | 'kompakt';
export type FunkPrioritaetFilter = 'routine' | 'prioritaet' | 'notfall';

export interface FunkprotokollFilter {
  kanalIds: string[];
  prioritaeten: FunkPrioritaetFilter[];
  vonDate?: string;
  bisDate?: string;
  absenderQuery?: string;
  volltextQuery?: string;
  dichteMode: DichteMode;
}

export const DEFAULT_FILTER: FunkprotokollFilter = {
  kanalIds: [],
  prioritaeten: [],
  dichteMode: 'bubbles',
};

export interface FunkprotokollFilterStoreState {
  byEinsatz: Record<string, FunkprotokollFilter>;
}

export const funkprotokollFilterStore = createStore<FunkprotokollFilterStoreState>({ byEinsatz: {} });

export const getFilterForEinsatz = (einsatzId: string): FunkprotokollFilter => funkprotokollFilterStore.state.byEinsatz[einsatzId] ?? DEFAULT_FILTER;

export const setFilterForEinsatz = (einsatzId: string, patch: Partial<FunkprotokollFilter>): void => {
  funkprotokollFilterStore.setState((s) => ({
    byEinsatz: {
      ...s.byEinsatz,
      [einsatzId]: { ...getFilterForEinsatz(einsatzId), ...patch },
    },
  }));
};

export const resetFilterForEinsatz = (einsatzId: string): void => {
  funkprotokollFilterStore.setState((s) => {
    const { [einsatzId]: _removed, ...rest } = s.byEinsatz;
    return { byEinsatz: rest };
  });
};
