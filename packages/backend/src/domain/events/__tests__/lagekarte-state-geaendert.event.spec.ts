// @ts-nocheck
// Mock cuid2 for Jest compatibility (ESM module issue) - MUST be before imports
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

import { LagekarteStateGeaendertEvent } from '../lagekarte-state-geaendert.event';
import { DomainEvent } from '@domain/common/domain-event';
import { LagekarteId } from '@domain/value-objects/lagekarte-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';

describe('LagekarteStateGeaendertEvent', () => {
  let testLagekarteId: LagekarteId;
  let testEinsatzId: EinsatzId;
  let testUserId: UserId;

  beforeEach(() => {
    testLagekarteId = LagekarteId.create().value!;
    testEinsatzId = EinsatzId.create().value!;
    testUserId = UserId.create().value!;
  });

  describe('Event Erstellung', () => {
    it('sollte Event mit allen Properties erstellen', () => {
      const event = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);

      expect(event.lagekarteId).toBe(testLagekarteId);
      expect(event.einsatzId).toBe(testEinsatzId);
      expect(event.changedBy).toBe(testUserId);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]{19,29}$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('sollte aggregateId auf lagekarteId.value setzen', () => {
      const event = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);

      expect(event.aggregateId).toBe(testLagekarteId.value);
    });
  });

  describe('eventName', () => {
    it('sollte "lagekarte.state_geaendert" zurückgeben', () => {
      expect(LagekarteStateGeaendertEvent.eventName()).toBe('lagekarte.state_geaendert');
    });

    it('sollte der Naming Convention folgen', () => {
      const name = LagekarteStateGeaendertEvent.eventName();

      expect(name).toMatch(/^lagekarte\.[a-z_]+$/);
      expect(name.startsWith('lagekarte.')).toBe(true);
    });
  });

  describe('DomainEvent Base Class', () => {
    it('sollte DomainEvent erweitern', () => {
      const event = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);
      expect(event).toBeInstanceOf(DomainEvent);
    });

    it('sollte einzigartige eventIds generieren', () => {
      const event1 = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);
      const event2 = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);

      expect(event1.eventId).not.toBe(event2.eventId);
    });

    it('sollte default Version 1 haben', () => {
      expect(LagekarteStateGeaendertEvent.eventVersion()).toBe(1);
    });
  });

  describe('Value Object Typisierung', () => {
    it('sollte mit typed Value Objects arbeiten', () => {
      const event = new LagekarteStateGeaendertEvent(testLagekarteId, testEinsatzId, testUserId);

      expect(event.lagekarteId).toBeInstanceOf(LagekarteId);
      expect(event.einsatzId).toBeInstanceOf(EinsatzId);
      expect(event.changedBy).toBeInstanceOf(UserId);
    });
  });
});
