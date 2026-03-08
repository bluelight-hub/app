// @ts-nocheck
import { AufbewahrungsKonfigurationGeaendertEvent } from './aufbewahrungs-konfiguration-geaendert.event';
import { EVENT_NAMES } from './event-names';

describe('AufbewahrungsKonfigurationGeaendertEvent', () => {
  it('sollte Event mit korrekten Daten erstellen', () => {
    const event = new AufbewahrungsKonfigurationGeaendertEvent(10, 5, 30, 60, true, 'admin-user-id', 'config-123');

    expect(event.alteFristJahre).toBe(10);
    expect(event.neueFristJahre).toBe(5);
    expect(event.alteFreigabeperiodeTage).toBe(30);
    expect(event.neueFreigabeperiodeTage).toBe(60);
    expect(event.automatischLoeschenAktiv).toBe(true);
    expect(event.geaendertVon).toBe('admin-user-id');
    expect(event.aggregateId).toBe('config-123');
    expect(event.eventId).toBeDefined();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('sollte korrekten Event-Namen zurueckgeben', () => {
    expect(AufbewahrungsKonfigurationGeaendertEvent.eventName()).toBe(EVENT_NAMES.AUFBEWAHRUNG.KONFIGURATION_GEAENDERT);
    expect(AufbewahrungsKonfigurationGeaendertEvent.eventName()).toBe('aufbewahrung.konfiguration_geaendert');
  });
});
