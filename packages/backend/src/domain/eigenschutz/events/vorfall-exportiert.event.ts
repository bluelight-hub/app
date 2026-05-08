import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

export type VorfallExportFormat = 'pdf' | 'json';

/**
 * Domain-Event — „Vorfall exportiert" (Story 5.6).
 *
 * Audit-Payload für erfolgreiche PDF-/JSON-Exporte. Enthält bewusst keine
 * Freitexte, Beteiligten, Snapshot-Daten oder Dateinamen.
 */
export class VorfallExportiertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    public readonly vorfallId: string,
    public readonly format: VorfallExportFormat,
    public readonly downloadedAt: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, undefined, aggregateId ?? vorfallId, occurredOn ?? downloadedAt);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT;
  }
}
