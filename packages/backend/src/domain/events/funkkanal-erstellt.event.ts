import { DomainEvent } from '@domain/common/domain-event';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { FunkkanalStatus } from '@domain/aggregates/funkkanal/funkkanal.entity';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { EVENT_NAMES } from './event-names';

/**
 * Payload-Daten eines neu erstellten Funkkanals.
 */
export interface FunkkanalErstelltPayload {
  readonly name: string;
  readonly details: KanalDetailsShape;
  readonly status: FunkkanalStatus;
  readonly sortIndex: number;
  readonly zweck?: string;
}

/**
 * Event: Ein Funkkanal wurde im Einsatz erstellt.
 */
export class FunkkanalErstelltEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.ERSTELLT;
  }

  constructor(
    public readonly funkkanalId: FunkkanalId,
    public readonly einsatzId: EinsatzId,
    public readonly data: FunkkanalErstelltPayload,
  ) {
    super(funkkanalId.value);
  }
}
