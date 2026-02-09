import { DomainEvent } from '@domain/common/domain-event';
import type { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

/**
 * Domain Event: Fuehrungsrhythmus-Template wurde fuer einen Einsatz aktiviert.
 *
 * Wird ausgeloest, wenn ein Fuehrungsrhythmus-Template auf einen Einsatz angewendet wird
 * und die zugehoerigen Erinnerungen erstellt wurden.
 */
export class FuehrungsrhythmusAktiviertEvent extends DomainEvent {
  constructor(
    public readonly templateId: FuehrungsrhythmusTemplateId,
    public readonly templateName: string,
    public readonly einsatzId: EinsatzId,
    public readonly erstellteErinnerungIds: ErinnerungId[],
    public readonly aktiviertVon: UserId,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.FUEHRUNGSRHYTHMUS_TEMPLATE.AKTIVIERT;
  }
}
