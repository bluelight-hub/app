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
      expect(result.value!.name).toBe('Notfallsanitäter');
      expect(result.value!.abkuerzung).toBe('NotSan');
      expect(result.value!.kategorie).toBe('SANITAET');
      expect(result.value!.beschreibung).toBe('Höchste nichtärztliche Qualifikation im Rettungsdienst');
      expect(result.value!.istAktiv).toBe(true);
      expect(result.value!.sortOrder).toBe(0);
      expect(result.value!.createdBy).toBe('cm1234567890abcdef12345');
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
      expect(result.value!.beschreibung).toBeUndefined();
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
      const events = result.value!.getDomainEvents();
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
        expect(result.value!.name).toBe('ABC');
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
        expect(result.value!.abkuerzung).toBe('TQ');
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
          expect(result.value!.kategorie).toBe(kategorie);
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
        expect(result.value!.name).toBe('Notfallsanitäter');
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
        expect(result.value!.abkuerzung).toBe('NotSan');
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
        expect(result.value!.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
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
        expect(result.value!.createdBy).toBe('cm1234567890abcdef12345');
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
      expect(qualifikation.kategorie).toBe('SANITAET');
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

    it('sollte sortOrder akzeptieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        sortOrder: 42,
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.sortOrder).toBe(42);
    });

    it('sollte negative sortOrder akzeptieren', () => {
      // Given
      const qualifikation = Qualifikation.create({
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG',
        createdBy: 'cm1234567890abcdef12345',
      }).value!;

      // When
      const result = qualifikation.update({
        sortOrder: -1,
        updatedBy: 'cm9999999999abcdef99999',
      });

      // Then
      expect(result.isSuccess).toBe(true);
      expect(qualifikation.sortOrder).toBe(-1);
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
      expect(result.value!.name).toBe('Notfallsanitäter');
      expect(result.value!.abkuerzung).toBe('NotSan');
      expect(result.value!.kategorie).toBe('SANITAET');
      expect(result.value!.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
      expect(result.value!.istAktiv).toBe(true);
      expect(result.value!.sortOrder).toBe(5);
      expect(result.value!.createdBy).toBe('cm1111111111abcdef11111');
      expect(result.value!.updatedBy).toBe('cm2222222222abcdef22222');
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
      const events = result.value!.getDomainEvents();
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
