import { useCallback, useMemo, useReducer } from 'react';
import type { PsaProfilValue } from '@bluelight-hub/shared/schemas/eigenschutz/psa-profil.schema';
import { type AusruestungsItem, getAusruestungsCheckliste } from '../constants/ausruestungs-checkliste.constants';

/**
 * Aggregiert die Item-Listen mehrerer aktiver Profile zu einer einzigen
 * Liste. De-Dupliziert nach `id`; Reihenfolge ist die Eingabe-Reihenfolge.
 *
 * Spiegelt 1:1 die Backend-`buildAggregierteCheckliste`-Logik (FR13 MVP).
 */
function aggregateChecklisten(profile: readonly PsaProfilValue[]): readonly AusruestungsItem[] {
  const seen = new Set<string>();
  const result: AusruestungsItem[] = [];
  for (const profil of profile) {
    for (const item of getAusruestungsCheckliste(profil).items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export type EquipmentChecklistStatus = 'pristine' | 'in-progress' | 'complete';

export interface UseEquipmentChecklistStateInput {
  /** Stabiler Identifier für die Bekanntgabe — beim Wechsel verfällt der State. */
  readonly propagationGroupId: string;
  readonly einheitenIds: readonly string[];
  readonly aktiveProfile: readonly PsaProfilValue[];
}

export interface UseEquipmentChecklistStateResult {
  readonly checked: ReadonlyMap<string, boolean>;
  readonly toggle: (einheitId: string, itemId: string, next: boolean) => void;
  readonly statusFor: (einheitId: string) => EquipmentChecklistStatus;
  /** Liste der nicht-gehakten Items pro Einheit — Vorlage für Story 3.6. */
  readonly missingItemsFor: (einheitId: string) => readonly { readonly id: string; readonly label: string }[];
  /** Lücken-Snapshot über alle Einheiten — Story-3.6-Convenience. */
  readonly missingByEinheit: ReadonlyMap<string, readonly string[]>;
  readonly reset: () => void;
}

interface State {
  readonly checked: ReadonlyMap<string, boolean>;
}

type Action = { type: 'toggle'; einheitId: string; itemId: string; next: boolean } | { type: 'reset' };

const compositeKey = (einheitId: string, itemId: string): string => `${einheitId}|${itemId}`;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'toggle': {
      const key = compositeKey(action.einheitId, action.itemId);
      const current = state.checked.get(key) ?? false;
      // Idempotenz: gleicher Wert → keine State-Mutation (verhindert
      // unnötige Re-Renders nachgelagerter Subscriber).
      if (current === action.next) return state;
      const next = new Map(state.checked);
      next.set(key, action.next);
      return { checked: next };
    }
    case 'reset':
      if (state.checked.size === 0) return state;
      return { checked: new Map() };
  }
}

const INITIAL_STATE: State = { checked: new Map<string, boolean>() };

/**
 * Lokaler Reducer-State für die `EquipmentChecklist` (Story 3.5 AC6).
 *
 * **Composite-Key-Pattern:** `${einheitId}|${itemId}` → boolean. Verschachtelte
 * Map-Strukturen (`Map<einheitId, Map<itemId, boolean>>`) sind bewusst
 * vermieden, weil sie das Rendering und die Diffing-Logik komplizieren.
 *
 * **Persistenz:** Bewusst KEINE Persistierung in `localStorage` oder Backend
 * (Epic-AC „lokal im Banner-Drawer-State"). Re-Bekanntgabe = neue Prüfung.
 *
 * **Status-Ableitung:** `pristine` (kein Item gehakt), `in-progress`
 * (1..n-1 gehakt), `complete` (alle Items gehakt). Die Items pro Einheit
 * leiten sich aus `aktiveProfile` über die Frontend-Konstanten ab — die
 * Listenreihenfolge ist deterministisch (Profil-Reihenfolge × Item-Reihenfolge).
 */
export function useEquipmentChecklistState(input: UseEquipmentChecklistStateInput): UseEquipmentChecklistStateResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const aggregierte = useMemo(() => aggregateChecklisten(input.aktiveProfile), [input.aktiveProfile]);

  const toggle = useCallback((einheitId: string, itemId: string, next: boolean) => {
    dispatch({ type: 'toggle', einheitId, itemId, next });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const statusFor = useCallback(
    (einheitId: string): EquipmentChecklistStatus => {
      if (aggregierte.length === 0) return 'pristine';
      let checkedCount = 0;
      for (const item of aggregierte) {
        if (state.checked.get(compositeKey(einheitId, item.id)) === true) checkedCount += 1;
      }
      if (checkedCount === 0) return 'pristine';
      if (checkedCount === aggregierte.length) return 'complete';
      return 'in-progress';
    },
    [aggregierte, state.checked],
  );

  const missingItemsFor = useCallback(
    (einheitId: string): readonly { readonly id: string; readonly label: string }[] => {
      return aggregierte.filter((item) => state.checked.get(compositeKey(einheitId, item.id)) !== true).map((item) => ({ id: item.id, label: item.label }));
    },
    [aggregierte, state.checked],
  );

  const missingByEinheit = useMemo(() => {
    const map = new Map<string, readonly string[]>();
    for (const einheitId of input.einheitenIds) {
      const labels = aggregierte.filter((item) => state.checked.get(compositeKey(einheitId, item.id)) !== true).map((item) => item.label);
      map.set(einheitId, labels);
    }
    return map;
  }, [input.einheitenIds, aggregierte, state.checked]);

  return {
    checked: state.checked,
    toggle,
    statusFor,
    missingItemsFor,
    missingByEinheit,
    reset,
  };
}
