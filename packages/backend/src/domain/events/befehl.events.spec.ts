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
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { BefehlErstelltEvent } from './befehl-erstellt.event';
import { BefehlZugestelltEvent } from './befehl-zugestellt.event';
import { BefehlStatusGeaendertEvent } from './befehl-status-geaendert.event';
import { BefehlQuittiertEvent } from './befehl-quittiert.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { UserId } from '@domain/value-objects/user-id';

describe('Befehl Domain Events', () => {
  describe('BefehlErstelltEvent', () => {
    it('should create event with valid properties', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const auftrag = 'Evakuierung Sektor A';
      const nummer = 'B-001';
      const empfaenger = ['ZF Nord', 'ZF Süd'];

      const event = new BefehlErstelltEvent(befehlId, einsatzId, auftrag, nummer, empfaenger);

      expect(event.befehlId).toBe(befehlId);
      expect(event.einsatzId).toBe(einsatzId);
      expect(event.auftrag).toBe(auftrag);
      expect(event.nummer).toBe(nummer);
      expect(event.empfaenger).toEqual(empfaenger);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]+$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should return correct event name', () => {
      expect(BefehlErstelltEvent.eventName()).toBe('befehl.erstellt');
    });

    it('should return default event version', () => {
      expect(BefehlErstelltEvent.eventVersion()).toBe(1);
    });

    it('should auto-generate unique event IDs', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const event1 = new BefehlErstelltEvent(befehlId, einsatzId, 'Test', 'B-001', []);
      const event2 = new BefehlErstelltEvent(befehlId, einsatzId, 'Test', 'B-001', []);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should generate recent timestamp', () => {
      const before = new Date();
      const event = new BefehlErstelltEvent(BefehlId.create().value!, EinsatzId.create().value!, 'Test', 'B-001', []);
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should support optional aggregateId', () => {
      const aggregateId = 'aggregate-123';
      const event = new BefehlErstelltEvent(BefehlId.create().value!, EinsatzId.create().value!, 'Test', 'B-001', [], aggregateId);

      expect(event.aggregateId).toBe(aggregateId);
    });

    it('should have undefined aggregateId when not provided', () => {
      const event = new BefehlErstelltEvent(BefehlId.create().value!, EinsatzId.create().value!, 'Test', 'B-001', []);

      expect(event.aggregateId).toBeUndefined();
    });

    it('should work with typed value objects', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const event = new BefehlErstelltEvent(befehlId, einsatzId, 'Test', 'B-001', []);

      expect(event.befehlId).toBeInstanceOf(BefehlId);
      expect(event.einsatzId).toBeInstanceOf(EinsatzId);
    });
  });

  describe('BefehlZugestelltEvent', () => {
    it('should create event with valid properties', () => {
      const befehlId = BefehlId.create().value!;
      const empfaengerId = 'user-empfaenger-1';
      const zugestelltAm = new Date('2026-01-15T10:00:00Z');

      const event = new BefehlZugestelltEvent(befehlId, empfaengerId, zugestelltAm);

      expect(event.befehlId).toBe(befehlId);
      expect(event.empfaengerId).toBe(empfaengerId);
      expect(event.zugestelltAm).toBe(zugestelltAm);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]+$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should return correct event name', () => {
      expect(BefehlZugestelltEvent.eventName()).toBe('befehl.zugestellt');
    });

    it('should return default event version', () => {
      expect(BefehlZugestelltEvent.eventVersion()).toBe(1);
    });

    it('should auto-generate unique event IDs', () => {
      const befehlId = BefehlId.create().value!;
      const event1 = new BefehlZugestelltEvent(befehlId, 'user-1', new Date());
      const event2 = new BefehlZugestelltEvent(befehlId, 'user-1', new Date());

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should support optional aggregateId', () => {
      const event = new BefehlZugestelltEvent(BefehlId.create().value!, 'user-1', new Date(), 'aggregate-123');

      expect(event.aggregateId).toBe('aggregate-123');
    });

    it('should preserve zugestelltAm timestamp exactly', () => {
      const zugestelltAm = new Date('2026-01-15T10:00:00Z');
      const event = new BefehlZugestelltEvent(BefehlId.create().value!, 'user-1', zugestelltAm);

      expect(event.zugestelltAm).toBe(zugestelltAm);
      expect(event.zugestelltAm.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    });

    it('should work with typed value objects', () => {
      const befehlId = BefehlId.create().value!;
      const event = new BefehlZugestelltEvent(befehlId, 'user-1', new Date());

      expect(event.befehlId).toBeInstanceOf(BefehlId);
    });
  });

  describe('BefehlStatusGeaendertEvent', () => {
    it('should create event with valid properties', () => {
      const befehlId = BefehlId.create().value!;
      const oldStatus = BefehlStatus.ERTEILT();
      const newStatus = BefehlStatus.ZUGESTELLT();

      const event = new BefehlStatusGeaendertEvent(befehlId, oldStatus, newStatus);

      expect(event.befehlId).toBe(befehlId);
      expect(event.oldStatus).toBe(oldStatus);
      expect(event.newStatus).toBe(newStatus);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]+$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should return correct event name', () => {
      expect(BefehlStatusGeaendertEvent.eventName()).toBe('befehl.status_geaendert');
    });

    it('should return default event version', () => {
      expect(BefehlStatusGeaendertEvent.eventVersion()).toBe(1);
    });

    it('should auto-generate unique event IDs', () => {
      const befehlId = BefehlId.create().value!;
      const event1 = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());
      const event2 = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should support optional aggregateId', () => {
      const event = new BefehlStatusGeaendertEvent(BefehlId.create().value!, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT(), 'aggregate-123');

      expect(event.aggregateId).toBe('aggregate-123');
    });

    it('should preserve status transition information', () => {
      const oldStatus = BefehlStatus.ERTEILT();
      const newStatus = BefehlStatus.KORRIGIERT();
      const event = new BefehlStatusGeaendertEvent(BefehlId.create().value!, oldStatus, newStatus);

      expect(event.oldStatus.value).toBe('ERTEILT');
      expect(event.newStatus.value).toBe('KORRIGIERT');
    });

    it('should work with typed value objects', () => {
      const befehlId = BefehlId.create().value!;
      const event = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());

      expect(event.befehlId).toBeInstanceOf(BefehlId);
      expect(event.oldStatus).toBeInstanceOf(BefehlStatus);
      expect(event.newStatus).toBeInstanceOf(BefehlStatus);
    });

    it('should support all valid status transitions', () => {
      const befehlId = BefehlId.create().value!;

      // ERTEILT → ZUGESTELLT
      const event1 = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ERTEILT(), BefehlStatus.ZUGESTELLT());
      expect(event1.oldStatus.value).toBe('ERTEILT');
      expect(event1.newStatus.value).toBe('ZUGESTELLT');

      // ZUGESTELLT → QUITTIERT
      const event2 = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ZUGESTELLT(), BefehlStatus.QUITTIERT());
      expect(event2.oldStatus.value).toBe('ZUGESTELLT');
      expect(event2.newStatus.value).toBe('QUITTIERT');

      // ERTEILT → KORRIGIERT
      const event3 = new BefehlStatusGeaendertEvent(befehlId, BefehlStatus.ERTEILT(), BefehlStatus.KORRIGIERT());
      expect(event3.oldStatus.value).toBe('ERTEILT');
      expect(event3.newStatus.value).toBe('KORRIGIERT');
    });
  });

  describe('BefehlQuittiertEvent', () => {
    it('should create event with valid properties', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const empfaengerId = UserId.create().value!;
      const quittierungArt = 'VERSTANDEN' as const;
      const nummer = 'B-001';
      const quittiertAm = new Date('2026-01-15T10:00:00Z');

      const event = new BefehlQuittiertEvent(befehlId, einsatzId, empfaengerId, quittierungArt, nummer, quittiertAm);

      expect(event.befehlId).toBe(befehlId);
      expect(event.einsatzId).toBe(einsatzId);
      expect(event.empfaengerId).toBe(empfaengerId);
      expect(event.quittierungArt).toBe('VERSTANDEN');
      expect(event.nummer).toBe(nummer);
      expect(event.quittiertAm).toBe(quittiertAm);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]+$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should return correct event name', () => {
      expect(BefehlQuittiertEvent.eventName()).toBe('befehl.quittiert');
    });

    it('should auto-generate unique event IDs', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const empfaengerId = UserId.create().value!;
      const event1 = new BefehlQuittiertEvent(befehlId, einsatzId, empfaengerId, 'VERSTANDEN', 'B-001', new Date());
      const event2 = new BefehlQuittiertEvent(befehlId, einsatzId, empfaengerId, 'VERSTANDEN', 'B-001', new Date());

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('should support optional aggregateId', () => {
      const aggregateId = 'aggregate-123';
      const event = new BefehlQuittiertEvent(BefehlId.create().value!, EinsatzId.create().value!, UserId.create().value!, 'VERSTANDEN', 'B-001', new Date(), aggregateId);

      expect(event.aggregateId).toBe(aggregateId);
    });

    it('should have undefined aggregateId when not provided', () => {
      const event = new BefehlQuittiertEvent(BefehlId.create().value!, EinsatzId.create().value!, UserId.create().value!, 'VERSTANDEN', 'B-001', new Date());

      expect(event.aggregateId).toBeUndefined();
    });

    it('should generate recent timestamp', () => {
      const before = new Date();
      const event = new BefehlQuittiertEvent(BefehlId.create().value!, EinsatzId.create().value!, UserId.create().value!, 'RUECKFRAGE', 'B-001', new Date());
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should work with typed value objects', () => {
      const befehlId = BefehlId.create().value!;
      const einsatzId = EinsatzId.create().value!;
      const empfaengerId = UserId.create().value!;
      const event = new BefehlQuittiertEvent(befehlId, einsatzId, empfaengerId, 'NICHT_VERSTANDEN', 'B-001', new Date());

      expect(event.befehlId).toBeInstanceOf(BefehlId);
      expect(event.einsatzId).toBeInstanceOf(EinsatzId);
      expect(event.empfaengerId).toBeInstanceOf(UserId);
    });

    it('should preserve quittiertAm timestamp exactly', () => {
      const quittiertAm = new Date('2026-01-15T10:00:00Z');
      const event = new BefehlQuittiertEvent(BefehlId.create().value!, EinsatzId.create().value!, UserId.create().value!, 'VERSTANDEN', 'B-001', quittiertAm);

      expect(event.quittiertAm).toBe(quittiertAm);
      expect(event.quittiertAm.toISOString()).toBe('2026-01-15T10:00:00.000Z');
    });
  });
});
