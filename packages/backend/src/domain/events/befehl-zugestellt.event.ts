import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein Befehl wurde an einen Empfänger zugestellt.
 */
export class BefehlZugestelltEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly empfaengerId: string,
    public readonly zugestelltAm: Date,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.ZUGESTELLT;
  }
}
