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
/**
 * Status-Achse für die Vorfall-Liste (Issue #415). Default in der UI ist
 * `'OFFEN'` (User-Feedback: „Vorfälle kann ich nicht schließen, sie sind immer
 * als offen sichtbar" — die Liste rendert per Default nur offene Vorfälle und
 * der Tab GESCHLOSSEN zeigt die geschlossenen).
 */
export type VorfallStatusFilter = 'OFFEN' | 'GESCHLOSSEN';

export interface VorfallFilterState {
  readonly abschnittIds: ReadonlyArray<string>;
  readonly vorfallZeitVon: string | undefined;
  readonly vorfallZeitBis: string | undefined;
  readonly unfallkasseRelevant: boolean | undefined;
  /** Issue #415: Status-Filter. Default `'OFFEN'`. */
  readonly status: VorfallStatusFilter;
}

const INITIAL_STATE: VorfallFilterState = {
  abschnittIds: [],
  vorfallZeitVon: undefined,
  vorfallZeitBis: undefined,
  unfallkasseRelevant: undefined,
  status: 'OFFEN',
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

export function setStatus(value: VorfallStatusFilter): void {
  vorfallFilterStore.setState((state) => (state.status === value ? state : { ...state, status: value }));
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
    status: next.status,
  }));
}

/**
 * Filter-Aktiv-Heuristik. Issue #415: der Status-Filter zählt **nicht** als
 * „aktiv", weil er immer einen Wert hat (Default `'OFFEN'`). Damit zeigt die
 * Empty-State-Logik weiter „Noch keine Vorfälle erfasst" statt „Keine Vorfälle
 * für diese Filter" für die Default-Sicht.
 */
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
