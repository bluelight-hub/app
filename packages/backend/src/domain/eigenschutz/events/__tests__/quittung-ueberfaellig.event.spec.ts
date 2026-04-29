import { EVENT_NAMES } from '@domain/events/event-names';
import { QuittungUeberfaelligEvent } from '../quittung-ueberfaellig.event';

describe('QuittungUeberfaelligEvent (Story 3.7)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
  const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
  const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyui00777';
  const ORIGINAL_EVENT_ID = 'clw3h8x9y0000qwertyui00888';
  const ZUWEISUNG_ID = 'clw3h8x9y0000qwertyui00999';

  it('(1) eventName() liefert den pre-allocated Namespace-Eintrag', () => {
    expect(QuittungUeberfaelligEvent.eventName()).toBe(EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_UEBERFAELLIG);
  });

  it('(2) trägt einsatzId, einheitId + Payload-Felder', () => {
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 6, ZUWEISUNG_ID);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    expect(event.originalEventId).toBe(ORIGINAL_EVENT_ID);
    expect(event.ueberfaelligSeitMin).toBe(6);
    expect(event.zuweisungId).toBe(ZUWEISUNG_ID);
  });

  it('(3) trägt userId === "SYSTEM" als Sentinel (Scheduler-Auslöser)', () => {
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 5, null);
    expect(event.userId).toBe('SYSTEM');
  });

  it('(4) zuweisungId darf null sein (älteres Original-Event ohne Feld)', () => {
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 7, null);
    expect(event.zuweisungId).toBeNull();
  });

  it('(5) aggregateId defaultet auf "{propagationGroupId}:{einheitId}"', () => {
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 5, null);
    expect(event.aggregateId).toBe(`${PROPAGATION_GROUP_ID}:${EINHEIT_ID}`);
  });

  it('(6) reicht aggregateId-Override für Rehydration durch', () => {
    const explicit = `${PROPAGATION_GROUP_ID}:${EINHEIT_ID}`;
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 5, null, explicit);
    expect(event.aggregateId).toBe(explicit);
  });

  it('(7) reicht occurredOn-Override für Rehydration durch', () => {
    const past = new Date('2021-01-01T00:00:00Z');
    const event = new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, PROPAGATION_GROUP_ID, ORIGINAL_EVENT_ID, 5, null, undefined, past);
    expect(event.occurredAt).toEqual(past);
  });
});
