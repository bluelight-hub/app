import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';

/**
 * Read-Model-Row für eine überfällige PSA-Bekanntgabe (Story 3.7 AC2).
 *
 * Eine Zeile entspricht genau einem `(propagationGroupId, einheitId)`-Paar
 * aus der Outbox-Tabelle, das den 5-Minuten-Threshold überschritten hat
 * und für das noch keine `PsaProfilQuittung` und kein bereits emittiertes
 * `QuittungUeberfaellig`-Event existieren.
 */
export interface PsaPropagationOverdueRow {
  /** Outbox-Row-ID des `PsaProfilGeaendert`-Events. */
  readonly originalEventId: string;
  readonly einsatzId: string;
  readonly einheitId: string;
  readonly propagationGroupId: string;
  /** Aus dem Payload extrahiert; nullable, falls ältere Events das Feld nicht tragen. */
  readonly zuweisungId: string | null;
  /** `occurredAt` des Original-Events (UTC). */
  readonly occurredAt: Date;
}

/**
 * Domain-Port für die Suche nach überfälligen PSA-Bekanntgaben (Story 3.7 AC2).
 *
 * **Bewusst KEINE Erweiterung von `IOutboxRepository`:** das bleibt
 * Framework-agnostisch und wird nicht für Eigenschutz-spezifische JSON-
 * Path-Filter aufgebläht.
 *
 * Aufgerufen vom `RepromptPsaQuittungScheduler` alle 30 s.
 */
export interface IPsaPropagationOverdueQueryPort {
  /**
   * Findet alle `(propagationGroupId, einheitId)`-Paare aus
   * `eigenschutz.psa_profil_geaendert`-Outbox-Rows, die ALT genug sind
   * (`occurredAt < threshold`) UND
   * - keine `PsaProfilQuittung`-Row haben (`einheitId + propagationGroupId`),
   * - kein bereits emittiertes `eigenschutz.quittung_ueberfaellig`-Event in
   *   der Outbox haben (Idempotenz, Story 3.7 AC4).
   *
   * **Bulk-Verhalten (Story 3.2):** Bei Bulk-Bekanntgaben mit N Einheiten
   * liefert diese Methode pro `(propagationGroupId, einheitId)` GENAU eine
   * Zeile zurück (DISTINCT-Pattern), niemals mehrere Treffer für dieselbe
   * Einheit, auch wenn `PsaProfilGeaendert` paarweise (AKTIVIERT/DEAKTIVIERT)
   * emittiert wurde — die älteste Zeile (kleinstes `occurredAt`) gewinnt.
   *
   * **Limit:** Schützt vor unbounded Memory bei langen Ausfällen + großen
   * Einsätzen. Konfigurierbar via Konstruktor-Param im Scheduler.
   */
  findUnacknowledgedPsaPropagations(threshold: Date, limit: number, tx?: TransactionContext): Promise<Result<PsaPropagationOverdueRow[]>>;
}
