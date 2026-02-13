import { DomainEvent } from '@domain/common/domain-event';
import type { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Notiz wurde aktualisiert (Story 7.3).
 */
export class NotizAktualisiertEvent extends DomainEvent {
  constructor(
    public readonly notizId: NotizId,
    public readonly einsatzId: string,
    public readonly titel: string,
    public readonly inhalt: string | null,
    public readonly kategorie: string | null,
    public readonly istTeamsichtbar: boolean,
    public readonly aktualisiertVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.NOTIZ.AKTUALISIERT;
  }
}
