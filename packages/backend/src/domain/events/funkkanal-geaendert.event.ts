import { DomainEvent } from '@domain/common/domain-event';
import type { KanalDetailsShape } from '@domain/aggregates/funkkanal/kanal-details.vo';
import type { FunkkanalStatus } from '@domain/aggregates/funkkanal/funkkanal.entity';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { EVENT_NAMES } from './event-names';

/**
 * Menge der Felder, die bei einer Änderung betroffen sein können. Leeres Objekt
 * ist erlaubt (z. B. Rollen-Änderung einer Zuordnung ohne Kanal-Felder).
 */
export interface FunkkanalChangedFields {
  readonly name?: string;
  readonly details?: KanalDetailsShape;
  readonly zweck?: string;
  readonly status?: FunkkanalStatus;
  readonly sortIndex?: number;
}

/**
 * Event: Stammdaten eines Funkkanals haben sich geändert.
 */
export class FunkkanalGeaendertEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.GEAENDERT;
  }

  constructor(
    public readonly funkkanalId: FunkkanalId,
    public readonly einsatzId: EinsatzId,
    public readonly changedFields: FunkkanalChangedFields,
  ) {
    super(funkkanalId.value);
  }
}
