import { DomainEvent } from '@domain/common/domain-event';
import type { LagekarteId } from '@domain/value-objects/lagekarte-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from './event-names';

/**
 * Event: Lagekarte-Zeichnungs-State wurde aktualisiert.
 *
 * Wird emittiert, wenn der GeoJSON-State einer Lagekarte gespeichert wird.
 * Dient als Benachrichtigung für andere Systeme (ETB, Audit) —
 * die Echtzeit-Synchronisation läuft über WebSocket-Deltas.
 *
 * @see Issue #638 - Lagekarte Echtzeit-Kollaboration
 */
export class LagekarteStateGeaendertEvent extends DomainEvent {
  constructor(
    public readonly lagekarteId: LagekarteId,
    public readonly einsatzId: EinsatzId,
    public readonly changedBy: UserId,
  ) {
    super(lagekarteId.value);
  }

  public static eventName(): string {
    return EVENT_NAMES.LAGEKARTE.STATE_GEAENDERT;
  }
}
