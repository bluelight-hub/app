// @ts-nocheck
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { SystemWarnungEvent } from './system-warnung.event';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';

describe('SystemWarnungEvent', () => {
  // Given: Standard-Testdaten
  const warnungTyp = WarnungTyp.ZUSTELLRATE;
  const schwellwert = 95;
  const aktuellerWert = 87.5;
  const timestamp = new Date('2026-02-24T10:00:00Z');

  it('sollte ein Event mit gültigen Properties erstellen', () => {
    // When: Event wird erstellt
    const event = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);

    // Then: Alle Properties sind korrekt gesetzt
    expect(event.warnungTyp).toBe(WarnungTyp.ZUSTELLRATE);
    expect(event.schwellwert).toBe(95);
    expect(event.aktuellerWert).toBe(87.5);
    expect(event.timestamp).toBe(timestamp);
    expect(event.eventId).toMatch(/^[a-z][a-z0-9]+$/);
    expect(event.occurredAt).toBeInstanceOf(Date);
  });

  it('sollte den korrekten Event-Namen zurueckgeben', () => {
    expect(SystemWarnungEvent.eventName()).toBe('system.warnung');
  });

  it('sollte die Default Event-Version zurueckgeben', () => {
    expect(SystemWarnungEvent.eventVersion()).toBe(1);
  });

  it('sollte eindeutige Event-IDs generieren', () => {
    // When: Zwei Events werden erstellt
    const event1 = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);
    const event2 = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);

    // Then: Event-IDs sind unterschiedlich
    expect(event1.eventId).not.toBe(event2.eventId);
  });

  it('sollte optionale aggregateId unterstuetzen', () => {
    const aggregateId = 'system-monitoring';
    const event = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp, aggregateId);

    expect(event.aggregateId).toBe(aggregateId);
  });

  it('sollte undefined aggregateId haben wenn nicht angegeben', () => {
    const event = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);

    expect(event.aggregateId).toBeUndefined();
  });

  it('sollte einen aktuellen Timestamp generieren', () => {
    // Given: Zeitfenster
    const before = new Date();

    // When: Event wird erstellt
    const event = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);

    // Then: occurredAt liegt im Zeitfenster
    const after = new Date();
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('sollte den uebergebenen Timestamp exakt beibehalten', () => {
    const event = new SystemWarnungEvent(warnungTyp, schwellwert, aktuellerWert, timestamp);

    expect(event.timestamp).toBe(timestamp);
    expect(event.timestamp.toISOString()).toBe('2026-02-24T10:00:00.000Z');
  });

  it('sollte mit allen WarnungTyp-Werten funktionieren', () => {
    for (const typ of Object.values(WarnungTyp)) {
      const event = new SystemWarnungEvent(typ, 90, 85, new Date());
      expect(event.warnungTyp).toBe(typ);
    }
  });
});
