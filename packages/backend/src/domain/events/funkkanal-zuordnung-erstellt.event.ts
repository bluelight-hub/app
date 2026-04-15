import { DomainEvent } from '@domain/common/domain-event';
import type { FunkkanalRolle, FunkkanalZuordnungKraftRef } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import type { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Eine Kraft wurde einem Funkkanal zugeordnet.
 */
export class FunkkanalZuordnungErstelltEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.ZUORDNUNG_ERSTELLT;
  }

  constructor(
    public readonly funkkanalId: FunkkanalId,
    public readonly einsatzId: EinsatzId,
    public readonly zuordnungId: FunkkanalZuordnungId,
    public readonly kraftRef: FunkkanalZuordnungKraftRef,
    public readonly rufnameSnapshot: string,
    public readonly rolle: FunkkanalRolle,
  ) {
    super(funkkanalId.value);
  }
}
