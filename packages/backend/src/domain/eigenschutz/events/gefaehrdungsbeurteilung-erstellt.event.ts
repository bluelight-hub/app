import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Gefährdungsbeurteilung wurde angelegt" (Story 2.1).
 *
 * Wird im `CreateGefaehrdungsbeurteilungHandler` atomar mit dem Aggregate
 * persistiert (Transactional Outbox Pattern). Konsumenten kommen später aus
 * Epic 6 (Ampel-Projection), Epic 7 (Telemetrie) und Epic 4 (Sicherungsposten-
 * Kontext); Story 2.1 registriert das Event aber bereits vollständig in der
 * 4-Stellen-Registry (Serializer, Deserializer, AdaptersModule, Adapters-
 * Barrel) — Framework-Phase-Ausnahme aus Story 1.7 entfällt.
 */
export class GefaehrdungsbeurteilungErstelltEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly gefaehrdungsbeurteilungId: string,
    public readonly vorlageId: string | null,
    public readonly itemCount: number,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? gefaehrdungsbeurteilungId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_ERSTELLT;
  }
}
