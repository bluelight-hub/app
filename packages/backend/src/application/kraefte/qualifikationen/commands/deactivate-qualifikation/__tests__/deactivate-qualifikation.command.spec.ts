// @ts-nocheck
/**
 * Unit Tests für DeactivateQualifikationCommand.
 *
 * Testet die Validierung des Commands mit verschiedenen Edge Cases:
 * - Fehlende/leere Felder (id, updatedBy)
 * - Whitespace-only Werte
 * - Whitespace Trimming
 * - CUID2 Format Validierung (falls implementiert)
 *
 * **Test Coverage Scope:**
 * - Factory Method Validation
 * - Boundary Conditions (empty, whitespace)
 * - Invalid Input (missing fields)
 * - Whitespace Trimming
 *
 * **Test Pattern:**
 * - AAA Pattern (Arrange-Act-Assert)
 * - Result<T> Pattern Assertions
 * - KEINE Framework-Dependencies
 */

import { DeactivateQualifikationCommand } from '../deactivate-qualifikation.command';

describe('DeactivateQualifikationCommand', () => {
  const validId = 'cm1234567890abcdef12345';
  const validUpdatedBy = 'cm9999999999abcdef99999';

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
        id: validId,
        updatedBy: validUpdatedBy,
      };

      // When
      const result = DeactivateQualifikationCommand.create(props);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.id).toBe(validId);
      expect(result.value?.updatedBy).toBe(validUpdatedBy);
    });

    describe('Validation: ID', () => {
      it('sollte fehlschlagen wenn ID fehlt (leerer String)', () => {
        // Given
        const props = {
          id: '',
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte fehlschlagen wenn ID nur Whitespace enthält', () => {
        // Given
        const props = {
          id: '   ',
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte fehlschlagen wenn ID nur Tabs enthält', () => {
        // Given
        const props = {
          id: '\t\t\t',
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte fehlschlagen wenn ID nur Newlines enthält', () => {
        // Given
        const props = {
          id: '\n\n\n',
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

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
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });

      it('sollte führende Whitespaces in ID trimmen', () => {
        // Given
        const props = {
          id: `\t\n  ${validId}`,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });

      it('sollte nachfolgende Whitespaces in ID trimmen', () => {
        // Given
        const props = {
          id: `${validId}  \t\n`,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });
    });

    describe('Validation: updatedBy', () => {
      it('sollte fehlschlagen wenn updatedBy fehlt (leerer String)', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn updatedBy nur Whitespace enthält', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '   ',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn updatedBy nur Tabs enthält', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '\t\t\t',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('updatedBy ist erforderlich');
      });

      it('sollte fehlschlagen wenn updatedBy nur Newlines enthält', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: '\n\n\n',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

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
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });

      it('sollte führende Whitespaces in updatedBy trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: `\t\n  ${validUpdatedBy}`,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });

      it('sollte nachfolgende Whitespaces in updatedBy trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: `${validUpdatedBy}  \t\n`,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });
    });

    describe('Boundary Conditions', () => {
      it('sollte beide Felder gleichzeitig trimmen', () => {
        // Given
        const props = {
          id: `  ${validId}  `,
          updatedBy: `  ${validUpdatedBy}  `,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });

      it('sollte sehr kurze gültige IDs akzeptieren', () => {
        // Given
        const shortId = 'a';
        const props = {
          id: shortId,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(shortId);
      });

      it('sollte sehr lange IDs akzeptieren', () => {
        // Given
        const longId = 'a'.repeat(1000);
        const props = {
          id: longId,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(longId);
      });

      it('sollte IDs mit Sonderzeichen akzeptieren', () => {
        // Given
        const specialId = 'cm_123-456_abc';
        const props = {
          id: specialId,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(specialId);
      });
    });

    describe('CUID2 Format (zukünftige Validierung)', () => {
      // Diese Tests schlagen derzeit fehl, da CUID2-Validierung noch nicht implementiert ist.
      // Sie dokumentieren die erwartete Validierung für zukünftige Implementierung.

      it.skip('sollte fehlschlagen mit ungültigem CUID2-Format für ID', () => {
        // Given
        const invalidId = 'not-a-valid-cuid2';
        const props = {
          id: invalidId,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültiges CUID2-Format');
      });

      it.skip('sollte fehlschlagen mit ungültigem CUID2-Format für updatedBy', () => {
        // Given
        const invalidUpdatedBy = 'not-a-valid-cuid2';
        const props = {
          id: validId,
          updatedBy: invalidUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültiges CUID2-Format');
      });

      it.skip('sollte fehlschlagen mit zu kurzem CUID2 für ID', () => {
        // Given
        const shortCuid = 'cm12345'; // zu kurz für CUID2 (< 24 Zeichen)
        const props = {
          id: shortCuid,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültiges CUID2-Format');
      });

      it.skip('sollte fehlschlagen mit ungültigen Zeichen im CUID2', () => {
        // Given
        const invalidCuid = 'cm!@#$%^&*()1234567890'; // ungültige Zeichen
        const props = {
          id: invalidCuid,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('ungültiges CUID2-Format');
      });
    });

    describe('Multiple Errors', () => {
      it('sollte fehlschlagen wenn beide Felder fehlen', () => {
        // Given
        const props = {
          id: '',
          updatedBy: '',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        // Erster Fehler wird zurückgegeben (ID validation kommt zuerst)
        expect(result.error).toContain('ID ist erforderlich');
      });

      it('sollte fehlschlagen wenn beide Felder nur Whitespace enthalten', () => {
        // Given
        const props = {
          id: '   ',
          updatedBy: '   ',
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isFailure).toBe(true);
        // Erster Fehler wird zurückgegeben (ID validation kommt zuerst)
        expect(result.error).toContain('ID ist erforderlich');
      });
    });

    describe('Edge Cases: Verschiedene Whitespace-Typen', () => {
      it('sollte Mixed Whitespace (Spaces, Tabs, Newlines) in ID trimmen', () => {
        // Given
        const props = {
          id: `  \t\n${validId}\n\t  `,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });

      it('sollte Mixed Whitespace in updatedBy trimmen', () => {
        // Given
        const props = {
          id: validId,
          updatedBy: `  \t\n${validUpdatedBy}\n\t  `,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        expect(result.isSuccess).toBe(true);
        expect(result.value?.updatedBy).toBe(validUpdatedBy);
      });

      it('sollte Unicode Whitespace (Non-Breaking Space) behandeln', () => {
        // Given
        const nonBreakingSpace = '\u00A0'; // Unicode Non-Breaking Space
        const props = {
          id: `${nonBreakingSpace}${validId}${nonBreakingSpace}`,
          updatedBy: validUpdatedBy,
        };

        // When
        const result = DeactivateQualifikationCommand.create(props);

        // Then
        // JavaScript trim() entfernt auch Unicode Whitespace wie Non-Breaking Space
        expect(result.isSuccess).toBe(true);
        expect(result.value?.id).toBe(validId);
      });
    });
  });
});
