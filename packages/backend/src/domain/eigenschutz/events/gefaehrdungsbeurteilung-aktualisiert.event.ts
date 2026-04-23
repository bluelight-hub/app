import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Diff-Felder eines einzelnen Items. `risikoklasse` ist **nicht** enthalten,
 * weil sie server-abgeleitet ist (Backend-Autorität aus `(eintritt, schaden)` —
 * ADR-013). Eine Änderung an `eintritt` oder `schaden` impliziert eine
 * Risikoklassen-Änderung und ist ausreichendes Diff-Signal.
 */
export type GefaehrdungItemFieldKey = 'title' | 'description' | 'eintritt' | 'schaden' | 'schutzmassnahmen';

/**
 * Per-Item-Diff einer Items-Update-Operation (Story 2.3, AC3).
 *
 * **Audit-Quersumme (Invariante):** Für jede Update-Operation gilt
 * `unchanged + updated.length + added.length === newItems.length`. Das
 * Aggregate prüft die Invariante und liefert `Result.fail('Invariant:DiffSumMismatch')`
 * bei Verletzung (Defense-in-Depth für Ampel-Projection, FR40 / Story 6.1).
 *
 * **ID-Semantik:** Items ohne client-seitige `id` zählen als neu angelegt und
 * tragen in `added` den synthetischen Eintrag `"generated:<sortIndex>"`. Der
 * Index referenziert die Reihenfolge der ID-losen Items im `newItems`-Array.
 *
 * **Content-Diff:** `updated[i].fields` listet genau die Felder, deren Werte
 * sich zwischen `old` und `new` unterscheiden (strikter `===`-Vergleich auf
 * den 5 `GefaehrdungItemFieldKey`-Feldern). Items mit identischem Shape
 * zählen in `unchanged`, **nicht** in `updated`.
 */
export interface GefaehrdungsbeurteilungAktualisiertChangedFields {
  added: string[];
  removed: string[];
  updated: Array<{ id: string; fields: GefaehrdungItemFieldKey[] }>;
  unchanged: number;
}

/**
 * Domain-Event — „Items einer Gefährdungsbeurteilung wurden aktualisiert"
 * (Story 2.2 baute den Endpoint; Story 2.3 schärft die Shape auf Per-Item-
 * Granularität, damit spätere Consumer — Ampel-Projection Epic 6, Telemetrie
 * Epic 7 — konkrete ID-Diffs konsumieren können).
 *
 * Wird im `UpdateGefaehrdungsbeurteilungItemsHandler` atomar mit dem Aggregate
 * persistiert (Transactional Outbox Pattern). Der Adapter ist aktuell Log-Only.
 */
export class GefaehrdungsbeurteilungAktualisiertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly gefaehrdungsbeurteilungId: string,
    public readonly fromVersion: number,
    public readonly toVersion: number,
    public readonly changedFields: GefaehrdungsbeurteilungAktualisiertChangedFields,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? gefaehrdungsbeurteilungId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT;
  }
}
