// @ts-nocheck
/**
 * Unit Tests für CreateQualifikationCommand.
 *
 * Testet die Validierung des Commands mit verschiedenen Edge Cases
 * und Boundary Conditions gemäß Review Round 3.
 *
 * **Test Coverage Scope:**
 * - Factory Method Validation
 * - Boundary Conditions (min/max lengths)
 * - Invalid Input (missing fields, invalid kategorie)
 * - Whitespace Trimming
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert)
 * - Result<T> Pattern Assertions
 * - KEINE Framework-Dependencies
 */

import { CreateQualifikationCommand } from '../create-qualifikation.command';

describe('CreateQualifikationCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // FACTORY METHOD: create()
  // ============================================

  describe('create() - Factory Method', () => {
    it('sollte Command mit gültigen Daten erstellen', () => {
      // Given
      const props = {
        name: 'Notfallsanitäter',
        abkuerzung: 'NotSan',
        kategorie: 'SANITAET' as const,
        createdBy: 'cm1234567890abcdef12345',
        beschreibung: 'Höchste nichtärztliche Qualifikation',
      };

      // When
      const result = CreateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.name).toBe('Notfallsanitäter');
      expect(result.value?.abkuerzung).toBe('NotSan');
      expect(result.value?.kategorie).toBe('SANITAET');
      expect(result.value?.createdBy).toBe('cm1234567890abcdef12345');
      expect(result.value?.beschreibung).toBe('Höchste nichtärztliche Qualifikation');
    });

    it('sollte Command ohne optionale Beschreibung erstellen', () => {
      // Given
      const props = {
        name: 'Zugführer',
        abkuerzung: 'ZFÜ',
        kategorie: 'FUEHRUNG' as const,
        createdBy: 'cm1234567890abcdef12345',
      };

      // When
      const result = CreateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.beschreibung).toBeUndefined();
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
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte fehlschlagen wenn Name zu kurz ist (< 3 Zeichen)', () => {
        // Given
        const props = {
          name: 'AB',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte fehlschlagen wenn Name nur Whitespace enthält', () => {
        // Given
        const props = {
          name: '   ',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte Name mit exakt 3 Zeichen akzeptieren', () => {
        // Given
        const props = {
          name: 'ABC',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('ABC');
      });

      it('sollte führende und nachfolgende Whitespaces in Name trimmen', () => {
        // Given
        const props = {
          name: '   Notfallsanitäter   ',
          abkuerzung: 'NotSan',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Notfallsanitäter');
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
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte fehlschlagen wenn Abkürzung zu kurz ist (< 2 Zeichen)', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'A',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte fehlschlagen wenn Abkürzung nur Whitespace enthält', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: '  ',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte Abkürzung mit exakt 2 Zeichen akzeptieren', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'TQ',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('TQ');
      });

      it('sollte Whitespaces in Abkürzung trimmen', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: '  NotSan  ',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('NotSan');
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
        const result = CreateQualifikationCommand.create(props);

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
          const props = {
            name: 'Test Qualifikation',
            abkuerzung: 'TEST',
            kategorie,
            createdBy: 'cm1234567890abcdef12345',
          };
          const result = CreateQualifikationCommand.create(props);
          expect(result.isSuccess).toBe(true);
          expect(result.value?.kategorie).toBe(kategorie);
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
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn createdBy nur Whitespace enthält', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: '   ',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('createdBy ist erforderlich');
      });

      it('sollte Whitespaces in createdBy trimmen', () => {
        // Given
        const props = {
          name: 'Test Qualifikation',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: '  cm1234567890abcdef12345  ',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.createdBy).toBe('cm1234567890abcdef12345');
      });
    });

    describe('Boundary Conditions', () => {
      it('sollte Name mit exakt 3 Zeichen akzeptieren (minimum)', () => {
        // Given
        const props = {
          name: 'ABC',
          abkuerzung: 'AB',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
      });

      it('sollte Abkürzung mit exakt 2 Zeichen akzeptieren (minimum)', () => {
        // Given
        const props = {
          name: 'Test',
          abkuerzung: 'AB',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
      });

      it('sollte sehr lange Namen akzeptieren', () => {
        // Given - Name AT max length (100 chars)
        const longName = 'A'.repeat(100);
        const props = {
          name: longName,
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name.length).toBe(100);
      });

      it('sollte zu lange Namen ablehnen (Defense-in-Depth)', () => {
        // Given - Name EXCEEDS max length (101 chars)
        const tooLongName = 'A'.repeat(101);
        const props = {
          name: tooLongName,
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('maximal 100 Zeichen');
      });

      it('sollte Abkürzungen am Max-Length akzeptieren', () => {
        // Given - Abkürzung AT max length (20 chars)
        const longAbkuerzung = 'B'.repeat(20);
        const props = {
          name: 'Test',
          abkuerzung: longAbkuerzung,
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung.length).toBe(20);
      });

      it('sollte zu lange Abkürzungen ablehnen (Defense-in-Depth)', () => {
        // Given - Abkürzung EXCEEDS max length (21 chars)
        const tooLongAbkuerzung = 'B'.repeat(21);
        const props = {
          name: 'Test',
          abkuerzung: tooLongAbkuerzung,
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('maximal 20 Zeichen');
      });

      it('sollte Beschreibungen am Max-Length akzeptieren', () => {
        // Given - Beschreibung AT max length (1000 chars)
        const longBeschreibung = 'C'.repeat(1000);
        const props = {
          name: 'Test',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: longBeschreibung,
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung?.length).toBe(1000);
      });

      it('sollte zu lange Beschreibungen ablehnen (Defense-in-Depth)', () => {
        // Given - Beschreibung EXCEEDS max length (1001 chars)
        const tooLongBeschreibung = 'C'.repeat(1001);
        const props = {
          name: 'Test',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: tooLongBeschreibung,
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('maximal 1000 Zeichen');
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte Whitespaces in Beschreibung trimmen', () => {
        // Given
        const props = {
          name: 'Test',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: '   Beschreibung mit Whitespace   ',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBe('Beschreibung mit Whitespace');
      });

      it('sollte leere Beschreibung (nur Whitespace) als undefined speichern', () => {
        // Given
        const props = {
          name: 'Test',
          abkuerzung: 'TEST',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
          beschreibung: '   ',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBeUndefined();
      });
    });

    describe('Special Characters', () => {
      it('sollte Umlaute in Name akzeptieren', () => {
        // Given
        const props = {
          name: 'Ärztlicher Leiter Rettungsdienst',
          abkuerzung: 'ÄLRD',
          kategorie: 'FUEHRUNG' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Ärztlicher Leiter Rettungsdienst');
        expect(result.value?.abkuerzung).toBe('ÄLRD');
      });

      it('sollte Sonderzeichen in Abkürzung akzeptieren', () => {
        // Given
        const props = {
          name: 'Test',
          abkuerzung: 'T-1',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('T-1');
      });

      it('sollte Zahlen in Name und Abkürzung akzeptieren', () => {
        // Given
        const props = {
          name: 'Stufe 123',
          abkuerzung: 'S123',
          kategorie: 'SANITAET' as const,
          createdBy: 'cm1234567890abcdef12345',
        };

        // When
        const result = CreateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Stufe 123');
        expect(result.value?.abkuerzung).toBe('S123');
      });
    });
  });
});
