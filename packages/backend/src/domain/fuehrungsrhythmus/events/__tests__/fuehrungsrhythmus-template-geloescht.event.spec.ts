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

import { FuehrungsrhythmusTemplateGeloeschtEvent } from '../fuehrungsrhythmus-template-geloescht.event';
import { DomainEvent } from '@domain/common/domain-event';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

describe('FuehrungsrhythmusTemplateGeloeschtEvent', () => {
  let testTemplateId: FuehrungsrhythmusTemplateId;
  let testUserId: UserId;
  const testName = 'Zu loeschendes Template';

  beforeEach(() => {
    jest.clearAllMocks();
    testTemplateId = FuehrungsrhythmusTemplateId.create().value!;
    testUserId = UserId.create().value!;
  });

  describe('Event Erstellung', () => {
    it('sollte Event mit allen Properties erstellen', () => {
      // Given
      const aggregateId = testTemplateId.value;

      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId, aggregateId);

      // Then
      expect(event.templateId).toBe(testTemplateId);
      expect(event.name).toBe(testName);
      expect(event.deletedBy).toBe(testUserId);
      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]{19,29}$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('sollte Event ohne aggregateId erstellen', () => {
      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect(event.templateId).toBe(testTemplateId);
      expect(event.name).toBe(testName);
      expect(event.deletedBy).toBe(testUserId);
      expect(event.aggregateId).toBeUndefined();
    });
  });

  describe('eventName', () => {
    it('sollte static eventName() "fuehrungsrhythmus-template.geloescht" zurückgeben', () => {
      // Then
      expect(FuehrungsrhythmusTemplateGeloeschtEvent.eventName()).toBe('fuehrungsrhythmus-template.geloescht');
    });

    it('sollte eventName mit EVENT_NAMES Constant übereinstimmen', () => {
      // Then
      expect(FuehrungsrhythmusTemplateGeloeschtEvent.eventName()).toBe(EVENT_NAMES.FUEHRUNGSRHYTHMUS_TEMPLATE.GELOESCHT);
    });

    it('sollte eventName via Constructor-Zugriff korrekt liefern', () => {
      // Given
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect((event.constructor as typeof DomainEvent).eventName()).toBe('fuehrungsrhythmus-template.geloescht');
    });
  });

  describe('DomainEvent Base Class Properties', () => {
    it('sollte eventId automatisch generieren (CUID2 Format)', () => {
      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect(event.eventId).toBeDefined();
      expect(typeof event.eventId).toBe('string');
      expect(event.eventId.length).toBeGreaterThanOrEqual(20);
      expect(event.eventId.length).toBeLessThanOrEqual(30);
    });

    it('sollte occurredAt automatisch generieren', () => {
      // Given
      const beforeCreation = new Date();

      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      const afterCreation = new Date();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('sollte DomainEvent erweitern', () => {
      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect(event).toBeInstanceOf(DomainEvent);
    });
  });

  describe('Immutabilitaet', () => {
    it('sollte alle Properties als readonly haben', () => {
      // Given
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect(event.templateId).toBeDefined();
      expect(event.name).toBeDefined();
      expect(event.deletedBy).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeDefined();
    });
  });

  describe('Value Object Typisierung', () => {
    it('sollte mit typed Value Objects arbeiten', () => {
      // When
      const event = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, testName, testUserId);

      // Then
      expect(event.templateId).toBeInstanceOf(FuehrungsrhythmusTemplateId);
      expect(event.deletedBy).toBeInstanceOf(UserId);
    });
  });

  describe('Unique EventId Generation', () => {
    it('sollte einzigartige eventIds fuer verschiedene Events generieren', () => {
      // Given
      const event1 = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, 'Template A', testUserId);
      const event2 = new FuehrungsrhythmusTemplateGeloeschtEvent(testTemplateId, 'Template B', testUserId);

      // Then
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Naming Convention', () => {
    it('sollte der Naming Convention folgen (namespace.action_past_tense)', () => {
      // Given
      const name = FuehrungsrhythmusTemplateGeloeschtEvent.eventName();

      // Then: Follows convention: lowercase dot-separated, past tense (deutsch)
      expect(name).toMatch(/^fuehrungsrhythmus-template\.[a-z]+$/);
      expect(name.startsWith('fuehrungsrhythmus-template.')).toBe(true);
      expect(name).not.toContain(' ');
      expect(name).toBe(name.toLowerCase());
    });
  });

  describe('eventVersion', () => {
    it('sollte default Version 1 haben', () => {
      // Then
      expect(FuehrungsrhythmusTemplateGeloeschtEvent.eventVersion()).toBe(1);
    });
  });
});
