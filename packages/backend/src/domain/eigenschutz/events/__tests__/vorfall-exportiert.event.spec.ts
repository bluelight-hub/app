import { EVENT_NAMES } from '@domain/events/event-names';
import { VorfallExportiertEvent } from '../vorfall-exportiert.event';

describe('VorfallExportiertEvent (Story 5.6)', () => {
  const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
  const USER_ID = 'clw3h8x9y0000qwertyui05002';
  const VORFALL_ID = 'clw3h8x9y0000qwertyui05004';
  const DOWNLOADED_AT = new Date('2026-05-07T10:00:00.000Z');

  it('(1) eventName liefert die zentrale EVENT_NAMES-Konstante', () => {
    expect(VorfallExportiertEvent.eventName()).toBe('eigenschutz.vorfall_exportiert');
    expect(VorfallExportiertEvent.eventName()).toBe(EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT);
  });

  it('(2) Konstruktor setzt Audit-Felder und aggregateId default auf vorfallId', () => {
    const event = new VorfallExportiertEvent(EINSATZ_ID, USER_ID, VORFALL_ID, 'pdf', DOWNLOADED_AT);

    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.userId).toBe(USER_ID);
    expect(event.einheitId).toBeUndefined();
    expect(event.vorfallId).toBe(VORFALL_ID);
    expect(event.format).toBe('pdf');
    expect(event.downloadedAt).toEqual(DOWNLOADED_AT);
    expect(event.aggregateId).toBe(VORFALL_ID);
    expect(event.occurredAt).toEqual(DOWNLOADED_AT);
  });

  it('(3) explicit aggregateId und occurredOn werden übernommen', () => {
    const explicitAggregateId = 'clw3h8x9y0000qwertyui05099';
    const occurredOn = new Date('2026-05-07T11:00:00.000Z');
    const event = new VorfallExportiertEvent(EINSATZ_ID, USER_ID, VORFALL_ID, 'json', DOWNLOADED_AT, explicitAggregateId, occurredOn);

    expect(event.aggregateId).toBe(explicitAggregateId);
    expect(event.occurredAt).toEqual(occurredOn);
  });

  it('(4) Payload enthält keine Vorfall-Freitexte oder Snapshot-Daten', () => {
    const event = new VorfallExportiertEvent(EINSATZ_ID, USER_ID, VORFALL_ID, 'json', DOWNLOADED_AT);
    const keys = Object.keys(event);

    expect(keys).not.toContain('was');
    expect(keys).not.toContain('wo');
    expect(keys).not.toContain('beteiligte');
    expect(keys).not.toContain('massnahmen');
    expect(keys).not.toContain('kontextSnapshot');
    expect(keys).not.toContain('filename');
  });
});
