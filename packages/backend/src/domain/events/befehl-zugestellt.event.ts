import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein Befehl wurde an einen Empfänger zugestellt.
 *
 * Enthaelt Rich Data fuer Event-Carried State Transfer,
 * damit ETB- und WebSocket-Handler keine DB-Queries benoetigen.
 */
export class BefehlZugestelltEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly empfaengerId: string,
    public readonly zugestelltAm: Date,
    public readonly einsatzId: EinsatzId,
    public readonly empfaengerName: string,
    public readonly nummer: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.ZUGESTELLT;
  }
}
