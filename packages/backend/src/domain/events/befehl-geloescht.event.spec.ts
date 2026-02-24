import { BefehlGeloeschtEvent } from './befehl-geloescht.event';
import { EVENT_NAMES } from './event-names';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

describe('BefehlGeloeschtEvent', () => {
  it('sollte Event mit korrekten Daten erstellen', () => {
    const einsatzId = EinsatzId.create().value!;
    const geloeschtAm = new Date();

    const event = new BefehlGeloeschtEvent(einsatzId, 5, geloeschtAm, 'aggregate-123');

    expect(event.einsatzId).toBe(einsatzId);
    expect(event.befehlCount).toBe(5);
    expect(event.geloeschtAm).toBe(geloeschtAm);
    expect(event.aggregateId).toBe('aggregate-123');
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('sollte korrekten Event-Namen zurueckgeben', () => {
    expect(BefehlGeloeschtEvent.eventName()).toBe(EVENT_NAMES.BEFEHL.GELOESCHT);
    expect(BefehlGeloeschtEvent.eventName()).toBe('befehl.geloescht');
  });
});
