import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Ausrüstungs-Lücke gemeldet" (Story 3.6, FR20).
 *
 * Wird vom `MeldeLueckeHandler` atomar mit dem Upsert auf `PsaProfilQuittung`
 * (Setzen von `lueckeGemeldet=true` + `lueckeNotiz`) in derselben Transaktion
 * über die Outbox persistiert. Adapter
 * (`infrastructure/eigenschutz/event-adapters/luecke-gemeldet.adapter.ts`)
 * broadcastet anschließend an Room `einsatz:{einsatzId}` über den Channel
 * `eigenschutz:luecke-gemeldet`, damit der Sicherheitsbeauftragte das
 * Lücken-Badge live aktualisiert sieht.
 *
 * **propagationGroupId Pflicht:** Eine Lücken-Meldung bezieht sich immer auf
 * eine konkrete Bekanntgabe-Gruppe (genau wie `QuittungAbgegebenEvent` —
 * Story 3.4). Wenn die zugehörige `PsaProfilGeaendert`-Outbox-Row aus der
 * Retention gefallen ist, lehnt der Handler den Vorgang mit
 * `NotFound:PsaPropagation` ab.
 *
 * **`meldung` ist Pflicht-Feld:** Eine Lücken-Meldung ohne Klartext-Notiz
 * wäre ein „Geister-Audit-Eintrag" — Story 3.6 Epic-AC verlangt explizit ein
 * Freitext-Feld. Validierung: 1 ≤ length ≤ 1000 (Schema-Constraint
 * `lueckeNotiz VARCHAR(1000)`).
 *
 * **gemeldetAm:** Server-Zeitstempel aus dem Repository-Upsert (gleiches
 * Pattern wie `QuittungAbgegebenEvent.quittiertAm`) — damit das Event den
 * tatsächlich persistierten Zeitstempel trägt, nicht den Caller-Wunsch.
 *
 * **Forward-Compat (Phase 2 / Story 6.x):** `LueckeAufgeloestEvent` ist
 * **nicht** Teil von Story 3.6 (PO-Default; siehe Q1). Das Resolve-Read-Model
 * (Story 6.1 `AmpelProjection.ungelesteRueckmeldungen`) konsumiert nur
 * `LueckeGemeldet` — Auflösung erfolgt im MVP organisatorisch (Telefon /
 * persönlich), erst Phase 2 liefert den expliziten „Lücke geklärt"-Pfad.
 */
export class LueckeGemeldetEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly propagationGroupId: string,
    public readonly meldung: string,
    public readonly gemeldetAm: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    // Invariante: `aggregateId` ist *immer* gleich `propagationGroupId`.
    // Der optionale Parameter existiert ausschließlich für den Round-Trip
    // im Deserializer; jeder andere Wert ist ein Vertragsbruch und wird
    // hier laut zurückgewiesen, statt sich still durchzuschlagen.
    if (aggregateId !== undefined && aggregateId !== propagationGroupId) {
      throw new Error(`LueckeGemeldetEvent: aggregateId (${aggregateId}) must equal propagationGroupId (${propagationGroupId})`);
    }
    super(einsatzId, userId, einheitId, propagationGroupId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.LUECKE_GEMELDET;
  }
}
