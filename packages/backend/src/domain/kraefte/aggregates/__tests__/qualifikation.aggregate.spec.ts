/**
 * Unit Tests für Qualifikation Aggregate.
 *
 * Testet alle factory methods, state mutations, query methods, business rules
 * und domain events gemäß Review Round 3.
 *
 * **Test Coverage Scope:**
 * - Factory Methods: create(), reconstitute()
 * - State Mutations: update(), deactivate(), reactivate()
 * - Business Rules: Validation (min/max lengths, kategorie, createdBy)
 * - Domain Events: QualifikationCreatedEvent, QualifikationUpdatedEvent
 * - Edge Cases: Special characters, whitespace trimming, overflow
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert) mit deutschen Kommentaren
 * - Result<T> Pattern Assertions
 * - KEINE Framework-Dependencies (pure TypeScript/Jest)
 */

import { Qualifikation, type CreateQualifikationProps } from '../qualifikation.aggregate';
import { QualifikationCreatedEvent } from '../../events/qualifikation-created.event';
import { QualifikationUpdatedEvent } from '../../events/qualifikation-updated.event';

describe('Qualifikation Aggregate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // FACTORY METHOD: create()
  // ============================================

  describe('create() - Factory Method', () => {
    it('sollte Qualifikation mit gültigen Daten erstellen', () => {
      // Given
      const props: CreateQualifikationProps = {
        name: 'Notfallsanitäter',
        abkuerzung: 'NotSan',
        kategorie: 'SANITAET',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Höchste nichtärztliche Qualifikation im Rettungsdienst',
      };

      // When
      const result = Qualifikation.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.name).toBe('Notfallsanitäter');
      expect(result.value?.abkuerzung).toBe('NotSan');
      expect(result.value?.kategorieValue).toBe('SANITAET');
      expect(result.value?.beschreibung).toBe('Höchste nichtärztliche Qualifikation im Rettungsdienst');
      expect(result.value?.istAktiv).toBe(true);
      expect(result.value?.sortOrder).toBe(0);
      expect(result.value?.createdBy).toBe('cm1234567890abcdef12345');
    });

    it('sollte Qualifikation ohne optionale Beschreibung erstellen', () => {
      // Given
      const props: CreateQualifikationProps = {
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      };

      // When
      const result = Qualifikation.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.beschreibung).toBeUndefined();
    });

    it('sollte Domain Event (QualifikationCreatedEvent) emittieren', () => {
      // Given
      const props: CreateQualifikationProps = {
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      };

      // When
      const result = Qualifikation.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      const events = result.value?.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(QualifikationCreatedEvent);
      const event = events[0] as QualifikationCreatedEvent;
      expect(event.name).toBe('Zugführer');
      expect(event.abkuerzung).toBe('ZFÜ');
      expect(event.kategorie).toBe('FUEHRUNG');
      expect(event.createdBy).toBe('cm1234567890abcdef12345');
    });

    describe('Validation: Name', () => {
      it('sollte fehlschlagen wenn Name fehlt', () => {
        // Given
        const props = {
          name: '',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte fehlschlagen wenn Name zu kurz ist (< 3 Zeichen)', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'AB',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte fehlschlagen wenn Name nur Whitespace enthält', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: '   ',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte Name mit exakt 3 Zeichen akzeptieren', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'ABC',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('ABC');
      });
    });

    describe('Validation: Abkürzung', () => {
      it('sollte fehlschlagen wenn Abkürzung fehlt', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: '',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte fehlschlagen wenn Abkürzung zu kurz ist (< 2 Zeichen)', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: 'A',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte Abkürzung mit exakt 2 Zeichen akzeptieren', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: 'TQ',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('TQ');
      });
    });

    describe('Validation: Kategorie', () => {
      it('sollte fehlschlagen mit ungültiger Kategorie', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'INVALID' as never,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Ungültige Kategorie');
        expect(result.error).toContain('INVALID');
      });

      it('sollte alle gültigen Kategorien akzeptieren', () => {
        // Given
        const validKategorien = ['FUEHRUNG', 'SANITAET', 'BETREUUNG', 'TECHNIK', 'SONSTIGES'] as const;

        // When / Then
        for (const kategorie of validKategorien) {
          const props: CreateQualifikationProps = {
            name: 'Test Qualifikation',
            abkuerzung: 'TEST',
            kategorie,
            createdBy: 'cm1234567890abcdef12345',
          };
          const result = Qualifikation.create(props);
          expect(result.isSuccess).toBe(true);
          expect(result.value?.kategorieValue).toBe(kategorie);
        }
      });
    });

    describe('Validation: createdBy', () => {
      it('sollte fehlschlagen wenn createdBy fehlt', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: '',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn createdBy nur Whitespace enthält', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: '   ',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy ist erforderlich');
      });
    });

    describe('Validation: Max-Length', () => {
      it('sollte Name mit exakt 100 Zeichen akzeptieren', () => {
        // Given
        const exactLength = 'a'.repeat(100);
        const props: CreateQualifikationProps = {
          name: exactLength,
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe(exactLength);
      });

      it('sollte Name mit mehr als 100 Zeichen ablehnen', () => {
        // Given
        const tooLong = 'a'.repeat(101);
        const props: CreateQualifikationProps = {
          name: tooLong,
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('100');
      });

      it('sollte Abkürzung mit exakt 20 Zeichen akzeptieren', () => {
        // Given
        const exactLength = 'a'.repeat(20);
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: exactLength,
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe(exactLength);
      });

      it('sollte Abkürzung mit mehr als 20 Zeichen ablehnen', () => {
        // Given
        const tooLong = 'a'.repeat(21);
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: tooLong,
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('20');
      });

      it('sollte Beschreibung mit exakt 1000 Zeichen akzeptieren', () => {
        // Given
        const exactLength = 'a'.repeat(1000);
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: exactLength,
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBe(exactLength);
      });

      it('sollte Beschreibung mit mehr als 1000 Zeichen ablehnen', () => {
        // Given
        const tooLong = 'a'.repeat(1001);
        const props: CreateQualifikationProps = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: tooLong,
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('1000');
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte führende und nachfolgende Whitespaces in Name trimmen', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: '   Notfallsanitäter   ',
          abkuerzung: 'NotSan',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Notfallsanitäter');
      });

      it('sollte Whitespaces in Abkürzung trimmen', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Notfallsanitäter',
          abkuerzung: '  NotSan  ',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('NotSan');
      });

      it('sollte Whitespaces in Beschreibung trimmen', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Notfallsanitäter',
          abkuerzung: 'NotSan',
          kategorie: 'SANITAET',
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: '   Höchste nichtärztliche Qualifikation   ',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
      });

      it('sollte Whitespaces in createdBy trimmen', () => {
        // Given
        const props: CreateQualifikationProps = {
          name: 'Notfallsanitäter',
          abkuerzung: 'NotSan',
          kategorie: 'SANITAET',
          createdBy: '  cm1234567890abcdef12345  ',
        };

        // When
        const result = Qualifikation.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.createdBy).toBe('cm1234567890abcdef12345');
      });
    });
  });

  // ============================================
  // BUSINESS METHOD: update()
  // ============================================

  describe('update() - Business Method', () => {
    it('sollte Name erfolgreich aktualisieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.clearDomainEvents(); // Clear creation event

      // When
      const result = qualifikation.update({
        name: 'Zugführer aktualisiert',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.name).toBe('Zugführer aktualisiert');
      expect(qualifikation.updatedBy).toBe('cm9999999999abcdef99999');
    });

    it('sollte mehrere Felder gleichzeitig aktualisieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.clearDomainEvents();

      // When
      const result = qualifikation.update({
        name: 'Neuer Name',
        abkuerzung: 'NEUE',
        kategorie: 'SANITAET',
        beschreibung: 'Neue Beschreibung',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.name).toBe('Neuer Name');
      expect(qualifikation.abkuerzung).toBe('NEUE');
      expect(qualifikation.kategorieValue).toBe('SANITAET');
      expect(qualifikation.beschreibung).toBe('Neue Beschreibung');
    });

    it('sollte QualifikationUpdatedEvent mit geänderten Feldern emittieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.clearDomainEvents();

      // When
      const result = qualifikation.update({
        name: 'Neuer Name',
        kategorie: 'SANITAET',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      const events = qualifikation.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(QualifikationUpdatedEvent);
      const event = events[0] as QualifikationUpdatedEvent;
      expect(event.changes).toMatchObject({
        name: 'Neuer Name',
        kategorie: 'SANITAET',
      });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
    });

    it('sollte fehlschlagen wenn Name zu kurz ist', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        name: 'AB',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('mindestens 3 Zeichen');
    });

    it('sollte fehlschlagen wenn Abkürzung zu kurz ist', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        abkuerzung: 'A',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('mindestens 2 Zeichen');
    });

    it('sollte fehlschlagen mit ungültiger Kategorie', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        kategorie: 'INVALID' as never,
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige Kategorie');
    });

    it('sollte fehlschlagen wenn updatedBy fehlt', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        name: 'Neuer Name',
        updatedBy: '',
      });

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('updatedBy ist erforderlich');
    });

    describe('sortOrder validation', () => {
      let validQualifikation: Qualifikation;

      beforeEach(() => {
        validQualifikation = Qualifikation.create({
          name: 'Zugführer',
          abkuerzung: 'ZFÜ',
          kategorie: 'FUEHRUNG',
          createdBy: 'cm1234567890abcdef12345',
        }).value!;
        validQualifikation.clearDomainEvents(); // Clear creation event
      });

      it('sollte NaN sortOrder ablehnen', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: Number.NaN,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss eine ganze Zahl sein');
      });

      it('sollte Infinity sortOrder ablehnen', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: Number.POSITIVE_INFINITY,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss eine ganze Zahl sein');
      });

      it('sollte -Infinity sortOrder ablehnen', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: Number.NEGATIVE_INFINITY,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss eine ganze Zahl sein');
      });

      it('sollte Dezimalzahlen (5.5) ablehnen', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: 5.5,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss eine ganze Zahl sein');
      });

      it('sollte negative Ganzzahlen (-1) ablehnen', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: -1,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('sortOrder muss größer oder gleich 0 sein');
      });

      it('sollte Null (0) als Grenzwert akzeptieren', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: 0,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isSuccess).toBe(true);
        expect(qualifikation.sortOrder).toBe(0);
      });

      it('sollte positive Ganzzahlen akzeptieren', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: 42,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isSuccess).toBe(true);
        expect(qualifikation.sortOrder).toBe(42);
      });

      it('sollte sehr große Ganzzahlen akzeptieren', () => {
        // Given
        const qualifikation = validQualifikation;

        // When
        const result = qualifikation.update({
          sortOrder: Number.MAX_SAFE_INTEGER,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then
        expect(result.isSuccess).toBe(true);
        expect(qualifikation.sortOrder).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('sollte sortOrder > MAX_SAFE_INTEGER akzeptieren (JavaScript Integer-Semantik)', () => {
        // Given
        const qualifikation = validQualifikation;

        // When - JavaScript behandelt MAX_SAFE_INTEGER + 1 als gültigen Integer
        // (Präzisionsverlust, aber Number.isInteger() returned true)
        const result = qualifikation.update({
          sortOrder: Number.MAX_SAFE_INTEGER + 1,
          updatedBy: 'cm9999999999abcdef99999',
        });

        // Then - Wert wird akzeptiert (JavaScript-Semantik)
        // HINWEIS: In der Praxis sollte sortOrder nie so groß werden.
        // Für echten Schutz wäre SafeInteger-Check erforderlich, aber
        // das ist für sortOrder (Reihenfolge) nicht business-kritisch.
        expect(result.isSuccess).toBe(true);
      });
    });

    it('sollte leere Beschreibung als undefined speichern (nach trim)', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Original',
      }).value!;

      // When
      const result = qualifikation.update({
        beschreibung: '   ',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.beschreibung).toBeUndefined();
    });
  });

  // ============================================
  // BUSINESS METHOD: deactivate()
  // ============================================

  describe('deactivate() - Business Method', () => {
    it('sollte Qualifikation erfolgreich deaktivieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.clearDomainEvents();

      // When
      const result = qualifikation.deactivate('cm9999999999abcdef99999');

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.istAktiv).toBe(false);
    });

    it('sollte fehlschlagen wenn bereits deaktiviert', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.deactivate('cm9999999999abcdef99999');

      // When
      const result = qualifikation.deactivate('cm9999999999abcdef99999');

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits deaktiviert');
    });
  });

  // ============================================
  // BUSINESS METHOD: reactivate()
  // ============================================

  describe('reactivate() - Business Method', () => {
    it('sollte Qualifikation erfolgreich reaktivieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.deactivate('cm9999999999abcdef99999');
      qualifikation.clearDomainEvents();

      // When
      const result = qualifikation.reactivate('cm9999999999abcdef99999');

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.istAktiv).toBe(true);
    });

    it('sollte QualifikationUpdatedEvent mit istAktiv=true emittieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.deactivate('cm9999999999abcdef99999');
      qualifikation.clearDomainEvents();

      // When
      const result = qualifikation.reactivate('cm9999999999abcdef99999');

      // Then
      expect(result.isSuccess).toBe(true);
      const events = qualifikation.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(QualifikationUpdatedEvent);
      const event = events[0] as QualifikationUpdatedEvent;
      expect(event.changes).toMatchObject({ istAktiv: true });
      expect(event.updatedBy).toBe('cm9999999999abcdef99999');
    });

    it('sollte fehlschlagen wenn bereits aktiv', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.reactivate('cm9999999999abcdef99999');

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('bereits aktiv');
    });
  });

  // ============================================
  // DOMAIN EVENTS: Reihenfolge und Multi-Operation Tests
  // ============================================

  describe('Domain Events - Reihenfolge', () => {
    it('sollte Domain Events in korrekter Reihenfolge nach mehreren Operationen emittieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      // Operation 1: Update Name
      qualifikation.update({
        name: 'Zugführer V2',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Operation 2: Update Kategorie
      qualifikation.update({
        kategorie: 'SANITAET',
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Operation 3: Deactivate
      qualifikation.deactivate('cm9999999999abcdef99999');

      // Then
      const events = qualifikation.getDomainEvents();
      expect(events).toHaveLength(4); // Created + 2x Updated + 1x Updated (deactivate)

      // Event 0: QualifikationCreatedEvent (von create())
      expect(events[0]).toBeInstanceOf(QualifikationCreatedEvent);
      expect((events[0] as QualifikationCreatedEvent).name).toBe('Zugführer');

      // Event 1: QualifikationUpdatedEvent (erste update() mit name)
      expect(events[1]).toBeInstanceOf(QualifikationUpdatedEvent);
      expect((events[1] as QualifikationUpdatedEvent).changes.name).toBe('Zugführer V2');

      // Event 2: QualifikationUpdatedEvent (zweite update() mit kategorie)
      expect(events[2]).toBeInstanceOf(QualifikationUpdatedEvent);
      expect((events[2] as QualifikationUpdatedEvent).changes.kategorie).toBe('SANITAET');

      // Event 3: QualifikationUpdatedEvent (deactivate() setzt istAktiv)
      expect(events[3]).toBeInstanceOf(QualifikationUpdatedEvent);
      expect((events[3] as QualifikationUpdatedEvent).changes.istAktiv).toBe(false);
    });

    it('sollte Domain Events in korrekter Reihenfolge bei Deactivate + Reactivate emittieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Test',
        abkuerzung: 'TST',
        kategorie: 'SONSTIGES',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;
      qualifikation.clearDomainEvents(); // Clear creation event

      // When - Verwende gültige CUID2-Identifier (update() validiert CUID2-Format)
      const deactivateUserId = 'cmaaaaaaaaaaaaaaaaaa001';
      const reactivateUserId = 'cmaaaaaaaaaaaaaaaaaa002';
      qualifikation.deactivate(deactivateUserId);
      qualifikation.reactivate(reactivateUserId);

      // Then
      const events = qualifikation.getDomainEvents();
      expect(events).toHaveLength(2);

      // Event 0: Deactivation
      expect(events[0]).toBeInstanceOf(QualifikationUpdatedEvent);
      expect((events[0] as QualifikationUpdatedEvent).changes.istAktiv).toBe(false);
      expect((events[0] as QualifikationUpdatedEvent).updatedBy).toBe(deactivateUserId);

      // Event 1: Reactivation
      expect(events[1]).toBeInstanceOf(QualifikationUpdatedEvent);
      expect((events[1] as QualifikationUpdatedEvent).changes.istAktiv).toBe(true);
      expect((events[1] as QualifikationUpdatedEvent).updatedBy).toBe(reactivateUserId);
    });
  });

  // ============================================
  // FACTORY METHOD: reconstitute()
  // ============================================

  describe('reconstitute() - Factory Method', () => {
    it('sollte Qualifikation aus Datenbank rekonstituieren', () => {
      // Given
      const props = {
        id: 'cm1234567890abcdef12345',
        name: 'Notfallsanitäter',
        abkuerzung: 'NotSan',
        kategorie: 'SANITAET' as const,
        beschreibung: 'Höchste nichtärztliche Qualifikation',
        istAktiv: true,
        sortOrder: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        createdBy: 'cm1111111111abcdef11111',
        updatedBy: 'cm2222222222abcdef22222',
      };

      // When
      const result = Qualifikation.reconstitute(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Notfallsanitäter');
      expect(result.value?.abkuerzung).toBe('NotSan');
      expect(result.value?.kategorieValue).toBe('SANITAET');
      expect(result.value?.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
      expect(result.value?.istAktiv).toBe(true);
      expect(result.value?.sortOrder).toBe(5);
      expect(result.value?.createdBy).toBe('cm1111111111abcdef11111');
      expect(result.value?.updatedBy).toBe('cm2222222222abcdef22222');
    });

    it('sollte KEINE Domain Events emittieren bei Reconstitution', () => {
      // Given
      const props = {
        id: 'cm1234567890abcdef12345',
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG' as const,
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cm1111111111abcdef11111',
      };

      // When
      const result = Qualifikation.reconstitute(props);

      // Then
      expect(result.isSuccess).toBe(true);
      const events = result.value?.getDomainEvents();
      expect(events).toHaveLength(0); // Keine Events bei Hydration
    });

    it('sollte fehlschlagen mit ungültiger ID', () => {
      // Given
      const props = {
        id: 'invalid-id',
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG' as const,
        istAktiv: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'cm1111111111abcdef11111',
      };

      // When
      const result = Qualifikation.reconstitute(props);

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Ungültige ID');
    });
  });
});
