import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { EigenschutzVorfall } from '../aggregates/eigenschutz-vorfall.aggregate';

/**
 * Filter-Eingabe für `findByEinsatzWithFilters` (Story 5.3, AC1).
 *
 * Halb-offenes Zeitintervall: `vorfallZeit >= vorfallZeitVon` und
 * `vorfallZeit < vorfallZeitBis`. Leere bzw. nicht gesetzte Felder bedeuten
 * „kein Filter-Constraint". Bei `einheitIds: []` wird sofort ein leeres
 * Result zurückgegeben (kein DB-Roundtrip — defense gegen `IN ()`-Fehler).
 */
export interface VorfallListFilter {
  readonly einheitIds?: ReadonlyArray<string>;
  readonly vorfallZeitVon?: Date;
  readonly vorfallZeitBis?: Date;
  readonly unfallkasseRelevant?: boolean;
}

/**
 * Read-Model-Row für die Vorfall-Liste (Story 5.3, AC1). Enthält bewusst
 * **keinen** `kontextSnapshot` — der ist mit ~35 KB pro Zeile zu groß für
 * eine Listen-Antwort und wird nur in der Detail-Page (Story 5.2) geladen.
 */
export interface VorfallListReadRow {
  readonly id: string;
  readonly einsatzId: string;
  readonly einheitId: string;
  readonly vorfallZeit: Date;
  readonly was: string;
  readonly unfallkasseRelevant: boolean;
  readonly erfasstAm: Date;
  readonly erfasstVonUserId: string;
}

/**
 * Hard-Cap für die Listen-Antwort (Story 5.3, AC1). Pattern analog
 * `findOpenByEinsatzId` in `i-sync-conflict.repository.ts`. Frontend zeigt
 * unter der Liste den Hinweis „Anzeige limitiert auf 200 Vorfälle — Filter
 * verfeinern", wenn `rows.length === LIST_HARD_LIMIT`.
 */
export const VORFALL_LIST_HARD_LIMIT = 200 as const;

/**
 * Port (Hexagonal-Architektur) für die Persistierung der `EigenschutzVorfall`-
 * Aggregate (Story 5.1, FR31/FR32). Implementierungen liegen in
 * `infrastructure/eigenschutz/repositories/`.
 *
 * **Append-only:** Vorfälle werden im MVP nie aktualisiert oder gelöscht;
 * dieser Port stellt nur einen `save`-Pfad (Insert) und Lese-Pfade bereit.
 */
export interface IEigenschutzVorfallRepository {
  /**
   * Speichert das Aggregate als neuen Vorfall innerhalb der übergebenen
   * Transaktion. Schreibt zusätzlich den `kontextSnapshot` (in Story 5.1
   * immer `{}`) — ab Story 5.2 trägt der Handler den realen Snapshot vor.
   */
  save(aggregate: EigenschutzVorfall, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Lädt einen Vorfall als volles Aggregate per ID.
   * `Result.ok(null)` = Not-Found (erwartetes Ergebnis, kein Exception-Fall).
   */
  findById(id: string, tx?: TransactionContext): Promise<Result<EigenschutzVorfall | null>>;

  /**
   * Prüft, ob ein Vorfall mit der gegebenen ID im Einsatz existiert. Wird vor
   * Cross-Einsatz-Lese/Schreibe-Operationen zur Defense-in-Depth genutzt.
   */
  existsInEinsatz(einsatzId: string, vorfallId: string, tx?: TransactionContext): Promise<Result<boolean>>;

  /**
   * Listen-Read-Model (Story 5.3, AC1). Liefert kompakte Rows ohne den
   * großen `kontextSnapshot`. Sortierung: `vorfallZeit DESC, id DESC`.
   * Cap: `VORFALL_LIST_HARD_LIMIT` Einträge.
   */
  findByEinsatzWithFilters(einsatzId: string, filter: VorfallListFilter, tx?: TransactionContext): Promise<Result<VorfallListReadRow[]>>;
}
