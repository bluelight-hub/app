import { EVENT_NAMES } from '@domain/events/event-names';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '../gefaehrdungsbeurteilung-aktualisiert.event';

describe('GefaehrdungsbeurteilungAktualisiertEvent (Story 2.2)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00077';

  it('eventName() liefert den Namespace-Konstanten', () => {
    expect(GefaehrdungsbeurteilungAktualisiertEvent.eventName()).toBe(EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT);
    expect(GefaehrdungsbeurteilungAktualisiertEvent.eventName()).toBe('eigenschutz.gefaehrdungsbeurteilung_aktualisiert');
  });

  it('Konstruktor füllt alle Felder und aggregateId fällt auf gefaehrdungsbeurteilungId zurück', () => {
    const event = new GefaehrdungsbeurteilungAktualisiertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, 1, 2, { added: 2, removed: 1, updated: 0 });

    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.gefaehrdungsbeurteilungId).toBe(BEURTEILUNG_ID);
    expect(event.fromVersion).toBe(1);
    expect(event.toVersion).toBe(2);
    expect(event.changedFields).toEqual({ added: 2, removed: 1, updated: 0 });
    expect(event.aggregateId).toBe(BEURTEILUNG_ID);
    expect(event.eventId).toBeTruthy();
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('erlaubt eine abweichende aggregateId', () => {
    const customAggregateId = 'clw3h8x9y0000qwertyuicustom';
    const event = new GefaehrdungsbeurteilungAktualisiertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, 1, 2, { added: 1, removed: 0, updated: 0 }, customAggregateId);
    expect(event.aggregateId).toBe(customAggregateId);
  });
});
