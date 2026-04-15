/**
 * useDichteMode
 *
 * Liefert den aktuellen Darstellungsmodus (Bubbles | Kompakt) des
 * Funkprotokolls für einen Einsatz plus einen Setter. Dünner Wrapper
 * um den Filter-Store, damit UI-Komponenten (z. B. Header-Toggle)
 * nicht direkt mit dem Store reden müssen.
 */

import { useStore } from '@tanstack/react-store';
import { useCallback } from 'react';
import { DEFAULT_FILTER, funkprotokollFilterStore, setFilterForEinsatz, type DichteMode } from '../stores/funkprotokoll-filter.store';

export interface UseDichteModeResult {
  dichteMode: DichteMode;
  setDichteMode: (mode: DichteMode) => void;
  toggleDichteMode: () => void;
}

export function useDichteMode(einsatzId: string): UseDichteModeResult {
  const dichteMode = useStore(funkprotokollFilterStore, (s) => s.byEinsatz[einsatzId]?.dichteMode ?? DEFAULT_FILTER.dichteMode);

  const setDichteMode = useCallback(
    (mode: DichteMode) => {
      setFilterForEinsatz(einsatzId, { dichteMode: mode });
    },
    [einsatzId],
  );

  const toggleDichteMode = useCallback(() => {
    setFilterForEinsatz(einsatzId, {
      dichteMode: dichteMode === 'bubbles' ? 'kompakt' : 'bubbles',
    });
  }, [einsatzId, dichteMode]);

  return { dichteMode, setDichteMode, toggleDichteMode };
}
