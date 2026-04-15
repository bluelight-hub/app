import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import type { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Eine Zuordnung wurde von einem Funkkanal entfernt.
 */
export class FunkkanalZuordnungEntferntEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.ZUORDNUNG_ENTFERNT;
  }

  constructor(
    public readonly funkkanalId: FunkkanalId,
    public readonly einsatzId: EinsatzId,
    public readonly zuordnungId: FunkkanalZuordnungId,
  ) {
    super(funkkanalId.value);
  }
}
