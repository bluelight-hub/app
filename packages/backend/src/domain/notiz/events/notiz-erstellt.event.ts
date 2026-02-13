import { DomainEvent } from '@domain/common/domain-event';
import type { NotizId } from '@domain/notiz/value-objects/notiz-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Notiz wurde erstellt.
 */
export class NotizErstelltEvent extends DomainEvent {
  constructor(
    public readonly notizId: NotizId,
    public readonly einsatzId: string,
    public readonly titel: string,
    public readonly erstelltVon: UserId,
    public readonly istTeamsichtbar: boolean,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.NOTIZ.ERSTELLT;
  }
}
