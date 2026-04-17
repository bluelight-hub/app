/**
 * splitViewStore (Issue #627, G4)
 *
 * Client-State fuer die Split-View zwischen Gefahrenmatrix und Lagekarte.
 * Die URL-Search-Params (`?split=true&focus=...`) sind authoritative Quelle;
 * der Store spiegelt sie bidirektional via `useSplitViewUrlSync`.
 *
 * Focus-Semantik — wenn gesetzt, rendert die Gegenseite (Matrix oder Karte)
 * die jeweilige Zielmarkierung (Scroll + Pulse bzw. Map-FlyTo).
 */

import { createStore } from '@tanstack/react-store';
import type { GefahrentypValue, SchutzobjektValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';

export type SplitViewFocus = { kind: 'zone'; zoneId: string } | { kind: 'cell'; gefahrentyp: GefahrentypValue; schutzobjekt: SchutzobjektValue };

export interface SplitViewState {
  isActive: boolean;
  focus: SplitViewFocus | null;
}

const initialState: SplitViewState = {
  isActive: false,
  focus: null,
};

export const splitViewStore = createStore<SplitViewState>(initialState);

export const splitViewActions = {
  activate(focus: SplitViewFocus | null = null) {
    splitViewStore.setState((s) => (s.isActive && s.focus === focus ? s : { isActive: true, focus }));
  },
  deactivate() {
    splitViewStore.setState((s) => (s.isActive || s.focus ? { isActive: false, focus: null } : s));
  },
  toggle() {
    splitViewStore.setState((s) => ({ isActive: !s.isActive, focus: s.isActive ? null : s.focus }));
  },
  setFocus(focus: SplitViewFocus | null) {
    splitViewStore.setState((s) => (focus === s.focus ? s : { ...s, focus }));
  },
  /** Setzt Store auf vorgegebenen Zustand — fuer URL-Sync-Hook. */
  setState(next: SplitViewState) {
    splitViewStore.setState((s) => (s.isActive === next.isActive && focusEquals(s.focus, next.focus) ? s : next));
  },
};

export function focusEquals(a: SplitViewFocus | null, b: SplitViewFocus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'zone' && b.kind === 'zone') return a.zoneId === b.zoneId;
  if (a.kind === 'cell' && b.kind === 'cell') return a.gefahrentyp === b.gefahrentyp && a.schutzobjekt === b.schutzobjekt;
  return false;
}

/**
 * Serialisiert einen `focus`-Wert als URL-Search-Param-String.
 * Gegenstueck zu {@link parseFocus}.
 */
export function serializeFocus(focus: SplitViewFocus | null): string | undefined {
  if (!focus) return undefined;
  if (focus.kind === 'zone') return `zone:${focus.zoneId}`;
  return `cell:${focus.gefahrentyp}:${focus.schutzobjekt}`;
}

/**
 * Parst einen URL-Param-String zurueck in einen `focus`-Wert.
 * Invalide Werte liefern `null` (geraeuschlos ignoriert).
 */
export function parseFocus(raw: string | null | undefined): SplitViewFocus | null {
  if (!raw) return null;
  if (raw.startsWith('zone:')) {
    const zoneId = raw.slice('zone:'.length);
    return zoneId.length > 0 ? { kind: 'zone', zoneId } : null;
  }
  if (raw.startsWith('cell:')) {
    const parts = raw.split(':');
    if (parts.length !== 3) return null;
    const [, typ, objekt] = parts;
    if (!typ || !objekt) return null;
    return { kind: 'cell', gefahrentyp: typ as GefahrentypValue, schutzobjekt: objekt as SchutzobjektValue };
  }
  return null;
}
