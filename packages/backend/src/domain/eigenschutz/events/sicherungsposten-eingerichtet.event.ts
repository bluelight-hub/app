import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Sicherungsposten wurde eingerichtet" (Story 4.1).
 *
 * Wird im `CreateSicherungspostenHandler` atomar mit dem Aggregate persistiert
 * (Transactional Outbox Pattern). Konsumenten kommen aus Story 4.3 (MapGL-
 * Marker-Layer-Live-Update) und Story 7.x (Telemetrie).
 *
 * **Payload-Diät:** Nur Identifier + zusammenfassende Felder — der vollständige
 * Standort + Personal-Liste wird nicht ins Event gespiegelt (Outbox-Größe +
 * Privacy für Freitext-Personal-Einträge). Konsumenten holen sich den Read-
 * Model-Stand bei Bedarf via Repository.
 */
export class SicherungspostenEingerichtetEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    public readonly sicherungspostenId: string,
    public readonly bezeichnung: string,
    public readonly standortKind: 'coordinate' | 'address',
    public readonly personalCount: number,
    einheitId?: string,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? sicherungspostenId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.SICHERUNGSPOSTEN_EINGERICHTET;
  }
}
