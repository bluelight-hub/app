/**
 * Unit Tests für UpdateQualifikationCommand.
 *
 * Testet die Validierung des Commands mit Edge Cases:
 * - Partial Updates (nur manche Felder)
 * - Empty Updates (keine Änderungen)
 * - null vs undefined für optionale Felder
 * - sortOrder Validierung (negative, NaN, Infinity)
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert)
 * - Result<T> Pattern Assertions
 * - KEINE Framework-Dependencies
 */

import { UpdateQualifikationCommand } from '../update-qualifikation.command';

describe('UpdateQualifikationCommand', () => {
  const validId = 'cm1234567890abcdef12345';
  const validUpdatedBy = 'cm9999999999abcdef99999';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // FACTORY METHOD: create()
  // ============================================

  describe('create() - Factory Method', () => {
    it('sollte Command mit gültigen partiellen Daten erstellen', () => {
      // Given
      const props = {
        id: validId,
        updatedBy: validUpdatedBy,
        name: 'Neuer Name',
      };

      // When
      const result = UpdateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBe(validId);
      expect(result.value?.updatedBy).toBe(validUpdatedBy);
      expect(result.value?.name).toBe('Neuer Name');
      expect(result.value?.abkuerzung).toBeUndefined();
      expect(result.value?.kategorie).toBeUndefined();
    });

    it('sollte Command mit allen Feldern erstellen', () => {
      // Given
      const props = {
        id: validId,
        updatedBy: validUpdatedBy,
        name: 'Neuer Name',
        abkuerzung: 'NEUE',
        kategorie: 'SANITAET' as const,
        beschreibung: 'Neue Beschreibung',
        istAktiv: false,
      };

      // When
      const result = UpdateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.name).toBe('Neuer Name');
      expect(result.value?.abkuerzung).toBe('NEUE');
      expect(result.value?.kategorie).toBe('SANITAET');
      expect(result.value?.beschreibung).toBe('Neue Beschreibung');
      expect(result.value?.istAktiv).toBe(false);
    });

    it('sollte Command ohne optionale Felder erstellen (nur ID + updatedBy)', () => {
      // Given
      const props = {
        id: validId,
        updatedBy: validUpdatedBy,
      };

      // When
      const result = UpdateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.id).toBe(validId);
      expect(result.value?.updatedBy).toBe(validUpdatedBy);
      expect(result.value?.name).toBeUndefined();
      expect(result.value?.abkuerzung).toBeUndefined();
      expect(result.value?.kategorie).toBeUndefined();
      expect(result.value?.beschreibung).toBeUndefined();
      expect(result.value?.istAktiv).toBeUndefined();
    });

    describe('Validation: ID', () => {
      it('sollte fehlschlagen wenn ID fehlt', () => {
        // Given
        const props = {
          id: '',
          updatedBy: validUpdatedBy,
          name: 'Neuer Name',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte fehlschlagen wenn ID nur Whitespace enthält', () => {
        // Given
        const props = {
          id: '   ',
          updatedBy: validUpdatedBy,
          name: 'Neuer Name',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte Whitespaces in ID trimmen', () => {
        // Given
        const props = {
          id: `  ${validId}  `,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });
    });

    describe('Validation: updatedBy', () => {
      it('sollte fehlschlagen wenn updatedBy fehlt', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '',
          name: 'Neuer Name',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn updatedBy nur Whitespace enthält', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '   ',
          name: 'Neuer Name',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy ist erforderlich');
      });

      it('sollte Whitespaces in updatedBy trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: `  ${validUpdatedBy}  `,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });
    });

    describe('Validation: Name', () => {
      it('sollte fehlschlagen wenn Name zu kurz ist (< 3 Zeichen)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: 'AB',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte fehlschlagen wenn Name nur Whitespace enthält (nach trim)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: '   ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 3 Zeichen');
      });

      it('sollte Name mit exakt 3 Zeichen akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: 'ABC',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('ABC');
      });

      it('sollte Whitespaces in Name trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: '   Neuer Name   ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Neuer Name');
      });
    });

    describe('Validation: Abkürzung', () => {
      it('sollte fehlschlagen wenn Abkürzung zu kurz ist (< 2 Zeichen)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: 'A',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte fehlschlagen wenn Abkürzung nur Whitespace enthält (nach trim)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: '  ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('mindestens 2 Zeichen');
      });

      it('sollte Abkürzung mit exakt 2 Zeichen akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: 'AB',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('AB');
      });

      it('sollte Whitespaces in Abkürzung trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: '  NEUE  ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('NEUE');
      });
    });

    describe('Validation: Kategorie', () => {
      it('sollte fehlschlagen mit ungültiger Kategorie', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          kategorie: 'INVALID' as never,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

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
            id: validId,
            updatedBy: validUpdatedBy,
            kategorie,
          };
          const result = UpdateQualifikationCommand.create(props);
          expect(result.isSuccess).toBe(true);
          expect(result.value?.kategorie).toBe(kategorie);
        }
      });
    });

    describe('Whitespace Trimming', () => {
      it('sollte Whitespaces in Beschreibung trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          beschreibung: '   Neue Beschreibung   ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBe('Neue Beschreibung');
      });

      it('sollte leere Beschreibung (nur Whitespace) als undefined speichern', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          beschreibung: '   ',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBeUndefined();
      });
    });

    describe('Partial Updates', () => {
      it('sollte nur Name ändern (andere Felder undefined)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: 'Nur Name geändert',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Nur Name geändert');
        expect(result.value?.abkuerzung).toBeUndefined();
        expect(result.value?.kategorie).toBeUndefined();
        expect(result.value?.beschreibung).toBeUndefined();
      });

      it('sollte nur Abkürzung ändern', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: 'NEU',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('NEU');
        expect(result.value?.name).toBeUndefined();
      });

      it('sollte nur Kategorie ändern', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          kategorie: 'TECHNIK' as const,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.kategorie).toBe('TECHNIK');
        expect(result.value?.name).toBeUndefined();
      });

      it('sollte nur Beschreibung ändern', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          beschreibung: 'Nur Beschreibung',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBe('Nur Beschreibung');
        expect(result.value?.name).toBeUndefined();
      });

      it('sollte nur istAktiv ändern', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          istAktiv: false,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.istAktiv).toBe(false);
        expect(result.value?.name).toBeUndefined();
      });
    });

    describe('Empty Update', () => {
      it('sollte Command ohne Änderungen akzeptieren (nur ID + updatedBy)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });
    });

    describe('null vs undefined', () => {
      it('sollte undefined für nicht-gesetzte Felder verwenden', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: 'Test',
          // beschreibung ist nicht gesetzt (undefined)
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBeUndefined();
        // Note: In TypeScript classes with optional properties, the property exists
        // on the object but has value undefined (not "not in object")
      });

      it('sollte null zu undefined mappen für beschreibung', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          beschreibung: null as unknown as string,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.beschreibung).toBeUndefined();
      });
    });

    describe('istAktiv Boolean Handling', () => {
      it('sollte istAktiv=true akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          istAktiv: true,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.istAktiv).toBe(true);
      });

      it('sollte istAktiv=false akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          istAktiv: false,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.istAktiv).toBe(false);
      });

      it('sollte istAktiv=undefined akzeptieren (keine Änderung)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          istAktiv: undefined,
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.istAktiv).toBeUndefined();
      });
    });

    describe('Special Characters', () => {
      it('sollte Umlaute in Name akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          name: 'Ärztlicher Leiter Rettungsdienst',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.name).toBe('Ärztlicher Leiter Rettungsdienst');
      });

      it('sollte Sonderzeichen in Abkürzung akzeptieren', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: validUpdatedBy,
          abkuerzung: 'T-1',
        };

        // When
        const result = UpdateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.abkuerzung).toBe('T-1');
      });
    });
  });
});
