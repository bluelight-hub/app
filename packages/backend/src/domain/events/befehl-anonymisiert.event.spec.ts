import { BefehlAnonymisiertEvent } from './befehl-anonymisiert.event';
import { EVENT_NAMES } from './event-names';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

describe('BefehlAnonymisiertEvent', () => {
  it('sollte Event mit korrekten Daten erstellen', () => {
    const einsatzId = EinsatzId.create().value!;
    const anonymisiertAm = new Date();

    const event = new BefehlAnonymisiertEvent(einsatzId, 5, 12, 3, anonymisiertAm, 'aggregate-123');

    expect(event.einsatzId).toBe(einsatzId);
    expect(event.befehlCount).toBe(5);
    expect(event.empfaengerCount).toBe(12);
    expect(event.kommentarCount).toBe(3);
    expect(event.anonymisiertAm).toBe(anonymisiertAm);
    expect(event.aggregateId).toBe('aggregate-123');
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('sollte korrekten Event-Namen zurueckgeben', () => {
    expect(BefehlAnonymisiertEvent.eventName()).toBe(EVENT_NAMES.BEFEHL.ANONYMISIERT);
    expect(BefehlAnonymisiertEvent.eventName()).toBe('befehl.anonymisiert');
  });
});
