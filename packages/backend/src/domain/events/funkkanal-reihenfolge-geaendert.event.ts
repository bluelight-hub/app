import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Ein Eintrag in der neuen Reihenfolge (Kanal-ID + Zielposition).
 */
export interface FunkkanalOrderingEntry {
  readonly kanalId: string;
  readonly sortIndex: number;
}

/**
 * Event: Die Reihenfolge der Funkkanäle eines Einsatzes wurde neu gesetzt.
 *
 * Aggregat-ID ist in diesem Fall die `einsatzId`, da der Reorder-Vorgang
 * mehrere Kanäle gleichzeitig betrifft und nicht einem einzelnen Kanal-Aggregat
 * zugeordnet werden kann.
 */
export class FunkkanalReihenfolgeGeaendertEvent extends DomainEvent {
  public static eventName(): string {
    return EVENT_NAMES.FUNKKANAL.REIHENFOLGE_GEAENDERT;
  }

  constructor(
    public readonly einsatzId: EinsatzId,
    public readonly ordering: ReadonlyArray<FunkkanalOrderingEntry>,
  ) {
    super(einsatzId.value);
  }
}
