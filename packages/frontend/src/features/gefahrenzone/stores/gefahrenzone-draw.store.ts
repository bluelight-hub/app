/**
 * Merkt sich die zuletzt verwendeten Defaults für die Gefahrenzone-Erstellung
 * (Gefahrentyp + Schutzobjekt). Session-lokal pro Einsatz; beim Einsatz-Wechsel
 * wird der Store zurückgesetzt.
 */

import { createStore } from '@tanstack/react-store';
import type { GefahrentypValue, SchutzobjektValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export interface GefahrenzoneDrawDefaultsState {
  einsatzId: string | null;
  lastUsedGefahrentyp: GefahrentypValue | null;
  lastUsedSchutzobjekt: SchutzobjektValue;
}

const initialState: GefahrenzoneDrawDefaultsState = {
  einsatzId: null,
  lastUsedGefahrentyp: null,
  lastUsedSchutzobjekt: 'MENSCHEN',
};

export const gefahrenzoneDrawStore = createStore<GefahrenzoneDrawDefaultsState>(initialState);

/**
 * Setzt den aktiven Einsatz; wechselt der Einsatz, werden die Defaults zurückgesetzt.
 */
export function setActiveEinsatzForDrawDefaults(einsatzId: string | null) {
  gefahrenzoneDrawStore.setState((state) => {
    if (state.einsatzId === einsatzId) {
      return state;
    }
    return {
      einsatzId,
      lastUsedGefahrentyp: null,
      lastUsedSchutzobjekt: 'MENSCHEN',
    };
  });
}

export function rememberLastUsedDefaults(gefahrentyp: GefahrentypValue, schutzobjekt: SchutzobjektValue) {
  gefahrenzoneDrawStore.setState((state) => ({
    ...state,
    lastUsedGefahrentyp: gefahrentyp,
    lastUsedSchutzobjekt: schutzobjekt,
  }));
}
