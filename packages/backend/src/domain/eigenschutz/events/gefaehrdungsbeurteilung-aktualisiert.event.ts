import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Zusammenfassendes Diff einer Items-Update-Operation. Zählungen sind absolut
 * (nicht prozentual): 2 Items neu hinzugefügt, 1 entfernt, 3 aktualisiert.
 */
export interface GefaehrdungsbeurteilungAktualisiertChangedFields {
  added: number;
  removed: number;
  updated: number;
}

/**
 * Domain-Event — „Items einer Gefährdungsbeurteilung wurden aktualisiert"
 * (Story 2.2).
 *
 * Wird im `UpdateGefaehrdungsbeurteilungItemsHandler` atomar mit dem Aggregate
 * persistiert (Transactional Outbox Pattern). Konsumenten: Epic 6
 * (Ampel-Projection), Epic 7 (Telemetrie), ggf. Epic 4 (Sicherungsposten-
 * Kontext), sobald diese Stories umgesetzt sind. Story 2.2 registriert das
 * Event in der 4-Stellen-Registry; der Adapter ist aktuell Log-Only.
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
