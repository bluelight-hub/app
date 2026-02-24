import { DomainEvent } from '@domain/common/domain-event';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event: Aufbewahrungskonfiguration wurde geändert.
 *
 * Wird ausgelöst wenn ein Admin die DSGVO-Aufbewahrungsregeln ändert.
 * Jede Änderung muss im ETB-Audit-Trail dokumentiert werden.
 *
 * @remarks Story 5.5 AC1
 */
export class AufbewahrungsKonfigurationGeaendertEvent extends DomainEvent {
  constructor(
    public readonly alteFristJahre: number,
    public readonly neueFristJahre: number,
    public readonly alteFreigabeperiodeTage: number,
    public readonly neueFreigabeperiodeTage: number,
    public readonly automatischLoeschenAktiv: boolean,
    public readonly geaendertVon: string,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  static eventName(): string {
    return EVENT_NAMES.AUFBEWAHRUNG.KONFIGURATION_GEAENDERT;
  }
}
