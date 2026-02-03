import { DomainEvent } from '@domain/common/domain-event';
import type { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { EVENT_NAMES } from '@domain/events/event-names';

export class ErinnerungsvorlageAktualisiertEvent extends DomainEvent {
  constructor(
    public readonly vorlageId: ErinnerungsvorlageId,
    public readonly titel: string,
    public readonly minuten: number,
    public readonly beschreibung: string | null,
    public readonly updatedBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.ERINNERUNGSVORLAGE.AKTUALISIERT;
  }
}
