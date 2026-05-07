import { createStore, useStore } from '@tanstack/react-store';

/**
 * Filter-State für die Vorfall-Liste (Story 5.3, AC5 — UX-DR26).
 *
 * **In-Memory-Session-State, KEINE Persistenz** (kein `tauri-plugin-store`/
 * `localStorage`). Persistenz läuft ausschließlich über die URL — das macht
 * den Filter Deep-Link-fähig (UX-Spec Z. 1037), ohne lokale State-Drift
 * zwischen Tabs/Geräten.
 *
 * Konvention:
 * - `abschnittIds` ist die rohe User-Auswahl im Multi-Select (vor dem
 *   Hierarchie-Resolver `resolveAbschnittToEinheitIds`). Die expandierte
 *   Liste wird erst im Hook (`useListVorfaelle`) berechnet, damit die
 *   Filter-Bar die User-Auswahl 1:1 anzeigen kann.
 * - `vorfallZeitVon` und `vorfallZeitBis` sind ISO-date-only-Strings
 *   (`yyyy-mm-dd`) — Zeitfilter granular auf Tag-Ebene reichen für die
 *   Nachbereitungs-Persona.
 * - `unfallkasseRelevant: undefined` = beide Werte (kein Filter).
 */
export interface VorfallFilterState {
  readonly abschnittIds: ReadonlyArray<string>;
  readonly vorfallZeitVon: string | undefined;
  readonly vorfallZeitBis: string | undefined;
  readonly unfallkasseRelevant: boolean | undefined;
}

const INITIAL_STATE: VorfallFilterState = {
  abschnittIds: [],
  vorfallZeitVon: undefined,
  vorfallZeitBis: undefined,
  unfallkasseRelevant: undefined,
};

export const vorfallFilterStore = createStore<VorfallFilterState>(INITIAL_STATE);

export function setAbschnittIds(ids: ReadonlyArray<string>): void {
  vorfallFilterStore.setState((state) => {
    const next = dedupe(ids);
    // Wenn der Inhalt unverändert ist, bestehende Reference behalten —
    // verhindert unnötige Memo-Invalidierungen im Resolver-Pfad
    // (Code-Review F12, Performance bei großen Einsätzen).
    if (arraysShallowEqual(state.abschnittIds, next)) return state;
    return { ...state, abschnittIds: next };
  });
}

export function setZeitraum(von: string | undefined, bis: string | undefined): void {
  vorfallFilterStore.setState((state) => ({ ...state, vorfallZeitVon: von, vorfallZeitBis: bis }));
}

export function setUnfallkasseRelevant(value: boolean | undefined): void {
  vorfallFilterStore.setState((state) => ({ ...state, unfallkasseRelevant: value }));
}

export function resetFilter(): void {
  vorfallFilterStore.setState(() => INITIAL_STATE);
}

/**
 * Replace-State, z. B. beim URL→Store-Sync. Ersetzt den kompletten Filter
 * atomar. Verzichtet bewusst auf eine Merge-Semantik, weil URL-Sync ein
 * vollständiger Snapshot ist.
 */
export function replaceFilterState(next: VorfallFilterState): void {
  vorfallFilterStore.setState(() => ({
    abschnittIds: dedupe(next.abschnittIds),
    vorfallZeitVon: next.vorfallZeitVon,
    vorfallZeitBis: next.vorfallZeitBis,
    unfallkasseRelevant: next.unfallkasseRelevant,
  }));
}

export function selectFilterIsActive(state: VorfallFilterState): boolean {
  return state.abschnittIds.length > 0 || state.vorfallZeitVon !== undefined || state.vorfallZeitBis !== undefined || state.unfallkasseRelevant !== undefined;
}

export function selectFilterCount(state: VorfallFilterState): number {
  let count = 0;
  if (state.abschnittIds.length > 0) count += 1;
  if (state.vorfallZeitVon !== undefined || state.vorfallZeitBis !== undefined) count += 1;
  if (state.unfallkasseRelevant !== undefined) count += 1;
  return count;
}

export function useVorfallFilterState(): VorfallFilterState {
  return useStore(vorfallFilterStore);
}

function dedupe(ids: ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.from(new Set(ids));
}

function arraysShallowEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
