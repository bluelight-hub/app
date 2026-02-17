import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Der Status eines Befehls hat sich geändert.
 */
export class BefehlStatusGeaendertEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly oldStatus: BefehlStatus,
    public readonly newStatus: BefehlStatus,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.STATUS_GEAENDERT;
  }
}
