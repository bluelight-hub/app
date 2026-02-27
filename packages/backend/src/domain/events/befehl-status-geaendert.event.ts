import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { BefehlStatus } from '@domain/value-objects/befehl-status';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Der Status eines Befehls hat sich geändert.
 *
 * Enthaelt Rich Data fuer Event-Carried State Transfer,
 * damit ETB- und WebSocket-Handler keine DB-Queries benoetigen.
 */
export class BefehlStatusGeaendertEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly oldStatus: BefehlStatus,
    public readonly newStatus: BefehlStatus,
    public readonly einsatzId: EinsatzId,
    public readonly nummer: string,
    aggregateId?: string,
    public readonly erstellerId?: UserId,
    public readonly befehlsgeberId?: UserId,
    public readonly empfaengerIds?: string[],
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.STATUS_GEAENDERT;
  }
}
