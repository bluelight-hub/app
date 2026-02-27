import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { UserId } from '@domain/value-objects/user-id';
import type { QuittierungArt } from '@domain/entities/befehl-empfaenger.entity';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein Empfaenger hat einen Befehl quittiert.
 *
 * Enthaelt Rich Data fuer Event-Carried State Transfer,
 * damit WebSocket-Handler keine DB-Queries benoetigen.
 *
 * @remarks Story 2.1 AC1
 */
export class BefehlQuittiertEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly einsatzId: EinsatzId,
    public readonly empfaengerId: UserId,
    public readonly quittierungArt: QuittierungArt,
    public readonly nummer: string,
    public readonly quittiertAm: Date,
    public readonly quittierungKommentar?: string,
    public readonly erstellerId?: UserId,
    public readonly befehlsgeberId?: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.QUITTIERT;
  }
}
