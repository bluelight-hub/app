import { DomainEvent } from '@domain/common/domain-event';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Eine System-Warnung wurde ausgeloest.
 *
 * Wird emittiert wenn ein Monitoring-Schwellwert ueberschritten wird.
 * Enthält Rich Data fuer Event Handler (keine DB-Queries noetig).
 *
 * @remarks Story 5.6 AC3
 */
export class SystemWarnungEvent extends DomainEvent {
  constructor(
    public readonly warnungTyp: WarnungTyp,
    public readonly schwellwert: number,
    public readonly aktuellerWert: number,
    public readonly timestamp: Date,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.SYSTEM.WARNUNG;
  }
}
