import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { ZeichenDefinitionProps } from '../value-objects/zeichen-definition.vo';

/**
 * Domain Event: Taktisches Zeichen wurde neu erstellt.
 * Enthält alle relevanten Daten für Event Handler (keine DB-Abfragen nötig).
 */
export class ZeichenErstelltEvent extends DomainEvent {
  constructor(
    public readonly zeichenId: string,
    public readonly einsatzId: string,
    public readonly zeichenDefinition: ZeichenDefinitionProps,
    public readonly label: string | undefined,
    public readonly referenzTyp: string | undefined,
    public readonly referenzId: string | undefined,
    public readonly createdBy: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.TAKTISCHES_ZEICHEN.ERSTELLT;
  }
}
