import { DomainEvent } from '@domain/common/domain-event';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Ein Kommentar wurde zu einem Befehl hinzugefügt.
 * Enthält Rich Data für Event Handler (keine DB-Queries nötig).
 */
export class BefehlKommentarHinzugefuegtEvent extends DomainEvent {
  constructor(
    public readonly befehlId: BefehlId,
    public readonly authorId: UserId,
    public readonly text: string,
    public readonly isRueckfrage: boolean,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.BEFEHL.KOMMENTAR_HINZUGEFUEGT;
  }
}
