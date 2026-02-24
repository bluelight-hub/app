import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein neuer Befehl wurde erstellt.
 *
 * Enthält Rich Data damit Event Handler keine DB-Queries benötigen.
 */
export class BefehlErstelltEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly einsatzId: EinsatzId,
    public readonly auftrag: string,
    public readonly nummer: string,
    public readonly empfaenger: string[],
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.ERSTELLT;
  }
}
