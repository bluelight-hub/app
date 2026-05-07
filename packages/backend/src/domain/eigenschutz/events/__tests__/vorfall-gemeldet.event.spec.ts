import { EVENT_NAMES } from '@domain/events/event-names';
import { VorfallGemeldetEvent } from '../vorfall-gemeldet.event';

describe('VorfallGemeldetEvent (Story 5.1)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
  const USER_ID = 'clw3h8x9y0000qwertyui05002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui05003';
  const VORFALL_ID = 'clw3h8x9y0000qwertyui05004';

  it('(1) eventName liefert die zentrale EVENT_NAMES-Konstante', () => {
    expect(VorfallGemeldetEvent.eventName()).toBe('eigenschutz.vorfall_gemeldet');
    expect(VorfallGemeldetEvent.eventName()).toBe(EVENT_NAMES.EIGENSCHUTZ.VORFALL_GEMELDET);
  });

  it('(2) Konstruktor setzt alle Audit-Felder + aggregateId default', () => {
    const vorfallZeit = new Date('2026-05-06T10:00:00.000Z');
    const event = new VorfallGemeldetEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, VORFALL_ID, vorfallZeit, true);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.vorfallId).toBe(VORFALL_ID);
    expect(event.vorfallZeit).toEqual(vorfallZeit);
    expect(event.unfallkasseRelevant).toBe(true);
    expect(event.aggregateId).toBe(VORFALL_ID);
  });

  it('(3) Payload enthält KEIN was/wo/beteiligte/massnahmen/kontextSnapshot (PII-Diät)', () => {
    const event = new VorfallGemeldetEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, VORFALL_ID, new Date(), false);
    const keys = Object.keys(event);
    expect(keys).not.toContain('was');
    expect(keys).not.toContain('wo');
    expect(keys).not.toContain('beteiligte');
    expect(keys).not.toContain('massnahmen');
    expect(keys).not.toContain('kontextSnapshot');
  });

  it('(4) explicit aggregateId override wird übernommen', () => {
    const explicit = 'clw3h8x9y0000qwertyui05099';
    const event = new VorfallGemeldetEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, VORFALL_ID, new Date(), false, explicit);
    expect(event.aggregateId).toBe(explicit);
  });
});
