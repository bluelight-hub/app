import { EVENT_NAMES } from '@domain/events/event-names';
import { GefaehrdungsbeurteilungErstelltEvent } from '../gefaehrdungsbeurteilung-erstellt.event';

describe('GefaehrdungsbeurteilungErstelltEvent (Story 2.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const USER_ID = 'clw3h8x9y0000qwertyui00099';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const BEURTEILUNG_ID = 'clw3h8x9y0000qwertyui00777';
  const VORLAGE_ID = 'clw3h8x9y0000qwertyui00111';

  it('(1) eventName() liefert den pre-allocated Namespace-Eintrag', () => {
    expect(GefaehrdungsbeurteilungErstelltEvent.eventName()).toBe(EVENT_NAMES.EIGENSCHUTZ.GEFAEHRDUNGSBEURTEILUNG_ERSTELLT);
  });

  it('(2) trägt einsatzId, userId, einheitId + Payload-Felder', () => {
    const event = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, VORLAGE_ID, 3);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.gefaehrdungsbeurteilungId).toBe(BEURTEILUNG_ID);
    expect(event.vorlageId).toBe(VORLAGE_ID);
    expect(event.itemCount).toBe(3);
  });

  it('(3) aggregateId defaultet auf gefaehrdungsbeurteilungId, wenn nicht explizit gesetzt', () => {
    const event = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, null, 0);
    expect(event.aggregateId).toBe(BEURTEILUNG_ID);
  });

  it('(4) akzeptiert vorlageId = null für Leer-Formular', () => {
    const event = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, null, 0);
    expect(event.vorlageId).toBeNull();
    expect(event.itemCount).toBe(0);
  });

  it('(5) reicht occurredOn-Override für Rehydration durch', () => {
    const past = new Date('2021-01-01T00:00:00Z');
    const event = new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, BEURTEILUNG_ID, null, 0, undefined, past);
    expect(event.occurredAt).toEqual(past);
  });
});
