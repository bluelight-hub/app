import { DomainEvent } from '@domain/common/domain-event';

/**
 * Abstrakte Basisklasse für alle Eigenschutz-Domain-Events.
 *
 * Erzwingt die beiden Invarianten aus Architecture §D:
 * 1. Jedes Eigenschutz-Event trägt eine `einsatzId` — für WebSocket-Scope
 *    (`einsatz:{einsatzId}`, ADR-006) und Outbox-Partitionierung.
 * 2. Jedes Eigenschutz-Event trägt eine `userId` — als Urheber (Audit,
 *    Unfallkassen-Export, Konflikt-Ownership).
 *
 * Zusätzlich optional `einheitId` — für Events, die eine konkrete Einheit
 * betreffen (PSA-Profil-Toggle, Lücke-Gemeldet etc.). Events ohne Einheit-
 * Kontext (z. B. generische Sicherheitsregel für den gesamten Einsatz) lassen
 * das Feld weg.
 *
 * Die 14 konkreten Event-Klassen, die von dieser Basis erben, liefert Epic 2–5
 * (siehe Architecture §B13 Event-Katalog MVP). Story 1.7 stellt nur das
 * Framework: Basisklasse + Namespace (`EVENT_NAMES.EIGENSCHUTZ`, 14 Einträge)
 * + Konsistenz-Spec.
 *
 * @see packages/backend/src/domain/common/domain-event.ts
 * @see Architecture §D (Event-Patterns, `architecture.md:1011-1062`)
 * @see Architecture §B13 (Event-Katalog, `architecture.md:734-751`)
 *
 * @example
 * ```typescript
 * // Beispiel-Subklassen-Skelett (liefert Epic 2+, NICHT Story 1.7):
 * //
 * // class PsaProfilGeaendertEvent extends EigenschutzDomainEvent {
 * //   constructor(
 * //     einsatzId: string,
 * //     userId: string,
 * //     public readonly psaProfilId: string,
 * //     public readonly aktiv: boolean,
 * //     einheitId?: string,
 * //     aggregateId?: string,
 * //   ) {
 * //     super(einsatzId, userId, einheitId, aggregateId);
 * //   }
 * //
 * //   static eventName(): string {
 * //     return EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT;
 * //   }
 * // }
 * ```
 */
export abstract class EigenschutzDomainEvent extends DomainEvent {
  protected constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    public readonly einheitId?: string,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(aggregateId, occurredOn);
  }
}
