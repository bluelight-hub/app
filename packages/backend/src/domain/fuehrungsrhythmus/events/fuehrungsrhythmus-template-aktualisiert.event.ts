import { DomainEvent } from '@domain/common/domain-event';
import type { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Fuehrungsrhythmus-Template wurde aktualisiert (Story 6.8).
 */
export class FuehrungsrhythmusTemplateAktualisiertEvent extends DomainEvent {
  constructor(
    public readonly templateId: FuehrungsrhythmusTemplateId,
    public readonly name: string,
    public readonly aktualisiertVon: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.FUEHRUNGSRHYTHMUS_TEMPLATE.AKTUALISIERT;
  }
}
