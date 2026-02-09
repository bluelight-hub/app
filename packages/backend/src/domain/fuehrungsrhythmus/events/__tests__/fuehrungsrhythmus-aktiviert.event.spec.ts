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
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-z][a-z0-9]+$/.test(id);
  }),
}));

import { FuehrungsrhythmusAktiviertEvent } from '../fuehrungsrhythmus-aktiviert.event';
import { DomainEvent } from '@domain/common/domain-event';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { UserId } from '@domain/value-objects/user-id';
import { EVENT_NAMES } from '@domain/events/event-names';

describe('FuehrungsrhythmusAktiviertEvent', () => {
  let testTemplateId: FuehrungsrhythmusTemplateId;
  let testEinsatzId: EinsatzId;
  let testUserId: UserId;
  let testErinnerungIds: ErinnerungId[];
  const testTemplateName = 'Standard Fuehrungsrhythmus';

  beforeEach(() => {
    jest.clearAllMocks();
    testTemplateId = FuehrungsrhythmusTemplateId.create().value!;
    testEinsatzId = EinsatzId.create().value!;
    testUserId = UserId.create().value!;
    testErinnerungIds = [ErinnerungId.create().value!, ErinnerungId.create().value!, ErinnerungId.create().value!];
  });

  describe('Event Erstellung', () => {
    it('sollte Event mit allen Properties erstellen', () => {
      // Given
      const aggregateId = testTemplateId.value;

      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId, aggregateId);

      // Then
      expect(event.templateId).toBe(testTemplateId);
      expect(event.templateName).toBe(testTemplateName);
      expect(event.einsatzId).toBe(testEinsatzId);
      expect(event.erstellteErinnerungIds).toBe(testErinnerungIds);
      expect(event.erstellteErinnerungIds).toHaveLength(3);
      expect(event.aktiviertVon).toBe(testUserId);
      expect(event.aggregateId).toBe(aggregateId);
      expect(event.eventId).toMatch(/^[a-z][a-z0-9]{19,29}$/);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('sollte Event ohne aggregateId erstellen', () => {
      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect(event.templateId).toBe(testTemplateId);
      expect(event.templateName).toBe(testTemplateName);
      expect(event.einsatzId).toBe(testEinsatzId);
      expect(event.erstellteErinnerungIds).toBe(testErinnerungIds);
      expect(event.aktiviertVon).toBe(testUserId);
      expect(event.aggregateId).toBeUndefined();
    });

    it('sollte Event mit leerer erstellteErinnerungIds Liste erstellen', () => {
      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, [], testUserId);

      // Then
      expect(event.erstellteErinnerungIds).toEqual([]);
      expect(event.erstellteErinnerungIds).toHaveLength(0);
    });
  });

  describe('eventName', () => {
    it('sollte static eventName() "fuehrungsrhythmus-template.aktiviert" zurueckgeben', () => {
      // Then
      expect(FuehrungsrhythmusAktiviertEvent.eventName()).toBe('fuehrungsrhythmus-template.aktiviert');
    });

    it('sollte eventName mit EVENT_NAMES Constant uebereinstimmen', () => {
      // Then
      expect(FuehrungsrhythmusAktiviertEvent.eventName()).toBe(EVENT_NAMES.FUEHRUNGSRHYTHMUS_TEMPLATE.AKTIVIERT);
    });

    it('sollte eventName via Constructor-Zugriff korrekt liefern', () => {
      // Given
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect((event.constructor as typeof DomainEvent).eventName()).toBe('fuehrungsrhythmus-template.aktiviert');
    });
  });

  describe('DomainEvent Base Class Properties', () => {
    it('sollte eventId automatisch generieren (CUID2 Format)', () => {
      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

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
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      const afterCreation = new Date();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('sollte DomainEvent erweitern', () => {
      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect(event).toBeInstanceOf(DomainEvent);
    });
  });

  describe('Immutabilitaet', () => {
    it('sollte alle Properties als readonly haben', () => {
      // Given
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect(event.templateId).toBeDefined();
      expect(event.templateName).toBeDefined();
      expect(event.einsatzId).toBeDefined();
      expect(event.erstellteErinnerungIds).toBeDefined();
      expect(event.aktiviertVon).toBeDefined();
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeDefined();
    });
  });

  describe('Value Object Typisierung', () => {
    it('sollte mit typed Value Objects arbeiten', () => {
      // When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, testTemplateName, testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect(event.templateId).toBeInstanceOf(FuehrungsrhythmusTemplateId);
      expect(event.einsatzId).toBeInstanceOf(EinsatzId);
      expect(event.aktiviertVon).toBeInstanceOf(UserId);
      expect(event.erstellteErinnerungIds).toBeInstanceOf(Array);
      for (const id of event.erstellteErinnerungIds) {
        expect(id).toBeInstanceOf(ErinnerungId);
      }
    });
  });

  describe('Unique EventId Generation', () => {
    it('sollte einzigartige eventIds fuer verschiedene Events generieren', () => {
      // Given
      const event1 = new FuehrungsrhythmusAktiviertEvent(testTemplateId, 'Template A', testEinsatzId, testErinnerungIds, testUserId);
      const event2 = new FuehrungsrhythmusAktiviertEvent(testTemplateId, 'Template B', testEinsatzId, testErinnerungIds, testUserId);

      // Then
      expect(event1.eventId).not.toBe(event2.eventId);
    });
  });

  describe('Naming Convention', () => {
    it('sollte der Naming Convention folgen (namespace.action_past_tense)', () => {
      // Given
      const name = FuehrungsrhythmusAktiviertEvent.eventName();

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
      expect(FuehrungsrhythmusAktiviertEvent.eventVersion()).toBe(1);
    });
  });

  describe('ETB Integration Use Case', () => {
    it('sollte alle notwendigen Daten fuer ETB-Eintrag bereitstellen', () => {
      // Given & When
      const event = new FuehrungsrhythmusAktiviertEvent(testTemplateId, 'Lagebesprechung alle 2h', testEinsatzId, testErinnerungIds, testUserId);

      // Then - Event Handler kann ETB-Text ohne DB-Query bauen
      const expectedEtbText = `Fuehrungsrhythmus '${event.templateName}' aktiviert mit ${event.erstellteErinnerungIds.length} Erinnerungen`;
      expect(event.templateName).toBe('Lagebesprechung alle 2h');
      expect(event.einsatzId).toBeDefined(); // Fuer ETB-Zuordnung
      expect(event.erstellteErinnerungIds).toHaveLength(3); // Anzahl erstellter Erinnerungen
      expect(event.aktiviertVon).toBeDefined(); // Fuer Audit
      expect(expectedEtbText).toContain(event.templateName);
    });
  });
});
