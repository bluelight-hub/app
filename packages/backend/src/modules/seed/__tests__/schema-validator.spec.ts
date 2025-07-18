import { CURRENT_SCHEMA_VERSION } from '../schema';
import { SchemaValidator, validateSeedData, validateSeedDataString } from '../schema-validator';

/**
 * Tests für den SchemaValidator.
 * Testet alle Validierungsszenarien und Edge Cases.
 */
describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  const validFullFormatData = {
    version: CURRENT_SCHEMA_VERSION,
    metadata: {
      name: 'Test Export',
      description: 'Test Beschreibung',
      exportDate: '2023-01-01T00:00:00.000Z',
      source: 'test',
    },
    einsaetze: [
      {
        name: 'Test Einsatz',
        beschreibung: 'Test Beschreibung',
        etbEntries: [
          {
            laufendeNummer: 1,
            kategorie: 'MELDUNG',
            inhalt: 'Test Ereignis',
            timestampEreignis: '2023-01-01T10:00:00.000Z',
            autorId: 'test-autor-id',
            autorName: 'Test Autor',
          },
        ],
      },
    ],
  };

  const validSimpleFormatData = {
    einsatz: {
      name: 'Einfacher Test Einsatz',
      beschreibung: 'Einfache Beschreibung',
    },
    initialEtbEntries: [
      {
        laufendeNummer: 1,
        kategorie: 'MELDUNG',
        inhalt: 'Test Ereignis',
        timestampEreignis: '2023-01-01T10:00:00.000Z',
        autorId: 'test-autor-id',
        autorName: 'Test Autor',
      },
    ],
  };

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validate', () => {
    describe('Format-Erkennung', () => {
      it('sollte vollständiges Format erkennen', () => {
        const result = validator.validate(validFullFormatData);

        expect(result.detectedFormat).toBe('full');
        expect(result.valid).toBe(true);
      });

      it('sollte einfaches Format erkennen', () => {
        const result = validator.validate(validSimpleFormatData);

        expect(result.detectedFormat).toBe('simple');
        expect(result.valid).toBe(true);
      });

      it('sollte unbekanntes Format erkennen', () => {
        const result = validator.validate({ invalidData: true });

        expect(result.detectedFormat).toBe('unknown');
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('UNKNOWN_FORMAT');
      });

      it('sollte null/undefined Daten als unbekannt markieren', () => {
        expect(validator.validate(null).detectedFormat).toBe('unknown');
        expect(validator.validate(undefined).detectedFormat).toBe('unknown');
        expect(validator.validate('string').detectedFormat).toBe('unknown');
      });
    });

    describe('Schema-Validierung - Vollformat', () => {
      it('sollte gültige Daten akzeptieren', () => {
        const result = validator.validate(validFullFormatData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.data).toEqual(validFullFormatData);
      });

      it('sollte fehlende Pflichtfelder erkennen', () => {
        const invalidData = { ...validFullFormatData };
        delete invalidData.version;

        const result = validator.validate(invalidData);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.code === 'UNKNOWN_FORMAT')).toBe(true);
      });

      it('sollte falsche Datentypen erkennen', () => {
        const invalidData = {
          ...validFullFormatData,
          version: 123, // sollte string sein
        };

        const result = validator.validate(invalidData);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code.includes('SCHEMA_TYPE'))).toBe(true);
      });
    });

    describe('Schema-Validierung - Einfachformat', () => {
      it('sollte gültige einfache Daten akzeptieren', () => {
        const result = validator.validate(validSimpleFormatData);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('sollte fehlende Einsatz-Daten erkennen', () => {
        const invalidData = { ...validSimpleFormatData };
        delete invalidData.einsatz;

        const result = validator.validate(invalidData);

        expect(result.valid).toBe(false);
      });
    });

    describe('Semantische Validierung', () => {
      it('sollte nicht unterstützte Schema-Version als Warnung behandeln', () => {
        const dataWithOldVersion = {
          ...validFullFormatData,
          version: '0.0.1',
        };

        const result = validator.validate(dataWithOldVersion);

        expect(result.warnings.some((w) => w.code === 'SCHEMA_VERSION_WARNING')).toBe(true);
      });

      it('sollte nicht unterstützte Schema-Version als Fehler bei strict mode', () => {
        const dataWithOldVersion = {
          ...validFullFormatData,
          version: '0.0.1',
        };

        const result = validator.validate(dataWithOldVersion, { validationLevel: 'strict' });

        expect(result.errors.some((e) => e.code === 'UNSUPPORTED_SCHEMA_VERSION')).toBe(true);
      });

      it('sollte doppelte Einsatz-Namen erkennen', () => {
        const dataWithDuplicates = {
          ...validFullFormatData,
          einsaetze: [
            { name: 'Doppelter Name', beschreibung: 'Test 1' },
            { name: 'Doppelter Name', beschreibung: 'Test 2' },
          ],
        };

        const result = validator.validate(dataWithDuplicates);

        expect(result.errors.some((e) => e.code === 'DUPLICATE_EINSATZ_NAMES')).toBe(true);
      });

      it('sollte doppelte laufende Nummern in ETB erkennen', () => {
        const dataWithDuplicateNumbers = {
          ...validFullFormatData,
          einsaetze: [
            {
              name: 'Test',
              beschreibung: 'Test',
              etbEntries: [
                { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test 1', autorId: 'author-1' },
                { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test 2', autorId: 'author-2' },
              ],
            },
          ],
        };

        const result = validator.validate(dataWithDuplicateNumbers);

        expect(result.errors.some((e) => e.code === 'DUPLICATE_LAUFENDE_NUMMER')).toBe(true);
      });

      it('sollte nicht-chronologische Zeitstempel als Warnung erkennen', () => {
        const dataWithWrongOrder = {
          ...validFullFormatData,
          einsaetze: [
            {
              name: 'Test',
              beschreibung: 'Test',
              etbEntries: [
                {
                  laufendeNummer: 1,
                  kategorie: 'MELDUNG',
                  inhalt: 'Test 1',
                  timestampEreignis: '2023-01-01T12:00:00.000Z',
                  autorId: 'author-1',
                },
                {
                  laufendeNummer: 2,
                  kategorie: 'MELDUNG',
                  inhalt: 'Test 2',
                  timestampEreignis: '2023-01-01T10:00:00.000Z', // früher als vorheriger
                  autorId: 'author-2',
                },
              ],
            },
          ],
        };

        const result = validator.validate(dataWithWrongOrder);

        expect(result.warnings.some((w) => w.code === 'TIMESTAMP_ORDER')).toBe(true);
      });

      it('sollte zu lange Einsatz-Namen erkennen', () => {
        const longName = 'x'.repeat(256); // über 255 Zeichen
        const dataWithLongName = {
          ...validFullFormatData,
          einsaetze: [
            {
              name: longName,
              beschreibung: 'Test',
            },
          ],
        };

        const result = validator.validate(dataWithLongName);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'SCHEMA_MAXLENGTH')).toBe(true);
      });

      it('sollte zu lange Einsatz-Namen im einfachen Format erkennen', () => {
        const longName = 'x'.repeat(256); // über 255 Zeichen
        const dataWithLongName = {
          einsatz: {
            name: longName,
            beschreibung: 'Test',
          },
        };

        const result = validator.validate(dataWithLongName);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'SCHEMA_MAXLENGTH')).toBe(true);
      });

      it('sollte Warnung für große Datensätze geben', () => {
        const largeDataset = {
          ...validFullFormatData,
          einsaetze: [
            {
              name: 'Test',
              beschreibung: 'Test',
              etbEntries: Array.from({ length: 1001 }, (_, i) => ({
                laufendeNummer: i + 1,
                kategorie: 'MELDUNG',
                inhalt: `Test ${i}`,
                autorId: `author-${i}`,
              })),
            },
          ],
        };

        const result = validator.validate(largeDataset);

        expect(result.warnings.some((w) => w.code === 'LARGE_DATASET')).toBe(true);
      });
    });

    describe('Metadaten-Generierung', () => {
      it('sollte korrekte Metadaten für Vollformat generieren', () => {
        const result = validator.validate(validFullFormatData);

        expect(result.metadata.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        expect(result.metadata.einsaetzeCount).toBe(1);
        expect(result.metadata.etbEntriesCount).toBe(1);
        expect(result.metadata.estimatedSizeBytes).toBeGreaterThan(0);
      });

      it('sollte korrekte Metadaten für Einfachformat generieren', () => {
        const result = validator.validate(validSimpleFormatData);

        expect(result.metadata.einsaetzeCount).toBe(1);
        expect(result.metadata.etbEntriesCount).toBe(1);
        expect(result.metadata.estimatedSizeBytes).toBeGreaterThan(0);
      });
    });

    describe('Fehlerbehandlung', () => {
      it('sollte Validierungs-Exceptions abfangen', () => {
        // Mock AJV um Exception zu werfen
        jest.spyOn(validator as any, 'detectFormat').mockImplementation(() => {
          throw new Error('Test error');
        });

        const result = validator.validate(validFullFormatData);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'VALIDATION_EXCEPTION')).toBe(true);
      });
    });
  });

  describe('Hilfsfunktionen', () => {
    describe('validateSeedData', () => {
      it('sollte als Convenience-Funktion funktionieren', () => {
        const result = validateSeedData(validFullFormatData);

        expect(result.valid).toBe(true);
        expect(result.detectedFormat).toBe('full');
      });
    });

    describe('validateSeedDataString', () => {
      it('sollte gültigen JSON-String validieren', () => {
        const jsonString = JSON.stringify(validFullFormatData);
        const result = validateSeedDataString(jsonString);

        expect(result.valid).toBe(true);
        expect(result.detectedFormat).toBe('full');
      });

      it('sollte ungültigen JSON-String abfangen', () => {
        const invalidJson = '{ invalid json }';
        const result = validateSeedDataString(invalidJson);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === 'JSON_PARSE_ERROR')).toBe(true);
        expect(result.detectedFormat).toBe('unknown');
      });
    });
  });

  describe('Private Methoden über Edge Cases testen', () => {
    it('sollte verschiedene AJV-Fehlertypen korrekt humanisieren', () => {
      // Test durch ungültige Daten, die verschiedene AJV-Fehler auslösen
      const testCases = [
        {
          data: {
            ...validFullFormatData,
            version: 123, // type error - should be string
          },
          expectedErrorType: 'SCHEMA_TYPE',
        },
        {
          data: {
            version: CURRENT_SCHEMA_VERSION,
            metadata: {}, // missing required fields
            einsaetze: [],
          },
          expectedErrorType: 'SCHEMA_REQUIRED',
        },
        {
          data: {
            ...validFullFormatData,
            einsaetze: [{ name: '' }], // minLength error
          },
          expectedErrorType: 'SCHEMA_MINLENGTH',
        },
        {
          data: {
            ...validFullFormatData,
            einsaetze: [
              {
                name: 'Test',
                beschreibung: 'Test',
                etbEntries: [
                  {
                    laufendeNummer: 1,
                    kategorie: 'INVALID_KATEGORIE', // enum error
                    inhalt: 'Test',
                    autorId: 'author-1',
                  },
                ],
              },
            ],
          },
          expectedErrorType: 'SCHEMA_ENUM',
        },
        {
          data: {
            ...validFullFormatData,
            einsaetze: [
              {
                name: 'Test',
                beschreibung: 'Test',
                etbEntries: [
                  {
                    laufendeNummer: 1,
                    kategorie: 'MELDUNG',
                    inhalt: 'Test',
                    timestampEreignis: 'invalid-date-format', // format error
                    autorId: 'author-1',
                  },
                ],
              },
            ],
          },
          expectedErrorType: 'SCHEMA_FORMAT',
        },
        {
          data: {
            ...validFullFormatData,
            einsaetze: [
              {
                name: 'Test',
                beschreibung: 'Test',
                etbEntries: [
                  {
                    laufendeNummer: -1, // minimum error
                    kategorie: 'MELDUNG',
                    inhalt: 'Test',
                    autorId: 'author-1',
                  },
                ],
              },
            ],
          },
          expectedErrorType: 'SCHEMA_MINIMUM',
        },
      ];

      testCases.forEach(({ data, expectedErrorType }) => {
        const result = validator.validate(data);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code.includes(expectedErrorType))).toBe(true);
      });
    });

    it('sollte ETB-Einträge ohne laufende Nummer verarbeiten', () => {
      const dataWithoutNumbers = {
        ...validFullFormatData,
        einsaetze: [
          {
            name: 'Test',
            beschreibung: 'Test',
            etbEntries: [
              { kategorie: 'MELDUNG', inhalt: 'Test ohne Nummer', autorId: 'author-1' },
              {
                laufendeNummer: 1,
                kategorie: 'MELDUNG',
                inhalt: 'Test mit Nummer',
                autorId: 'author-2',
              },
            ],
          },
        ],
      };

      const result = validator.validate(dataWithoutNumbers);
      // Sollte keine Fehler wegen fehlender Nummern geben
      expect(result.errors.filter((e) => e.code === 'DUPLICATE_LAUFENDE_NUMMER')).toHaveLength(0);
    });

    it('sollte Einsätze ohne ETB-Einträge verarbeiten', () => {
      const dataWithoutEtb = {
        ...validFullFormatData,
        einsaetze: [
          {
            name: 'Test ohne ETB',
            beschreibung: 'Test',
          },
        ],
      };

      const result = validator.validate(dataWithoutEtb);
      expect(result.valid).toBe(true);
      expect(result.metadata.etbEntriesCount).toBe(0);
    });

    it('sollte Einfachformat ohne ETB-Einträge verarbeiten', () => {
      const simpleWithoutEtb = {
        einsatz: {
          name: 'Einfacher Test',
          beschreibung: 'Test',
        },
      };

      const result = validator.validate(simpleWithoutEtb);
      expect(result.valid).toBe(true);
      expect(result.metadata.etbEntriesCount).toBe(0);
    });

    it('sollte EINSATZ_NAME_TOO_LONG Fehler für zu lange Namen auslösen', () => {
      const longName = 'x'.repeat(256); // über 255 Zeichen
      const dataWithLongName = {
        version: CURRENT_SCHEMA_VERSION,
        metadata: {
          name: 'Test Export',
          description: 'Test',
          exportDate: '2023-01-01T00:00:00.000Z',
          source: 'test',
        },
        einsaetze: [
          {
            name: longName,
            beschreibung: 'Test',
          },
        ],
      };

      const result = validator.validate(dataWithLongName);
      expect(result.valid).toBe(false);
      // Should have either SCHEMA_MAXLENGTH or EINSATZ_NAME_TOO_LONG
      const hasMaxLengthError = result.errors.some((e) => e.code === 'SCHEMA_MAXLENGTH');
      const hasNameTooLongError = result.errors.some((e) => e.code === 'EINSATZ_NAME_TOO_LONG');
      expect(hasMaxLengthError || hasNameTooLongError).toBe(true);
    });

    it('sollte AJV-Fehler ohne keyword korrekt behandeln', () => {
      // Mock AJV um einen Fehler ohne keyword zu simulieren
      const mockValidator = {
        errors: [
          {
            instancePath: '/test',
            schemaPath: '#/test',
            data: 'test',
            message: 'Test error without keyword',
          },
        ],
      };

      const ajvErrors = (validator as any).convertAjvErrors(mockValidator.errors);
      expect(ajvErrors).toHaveLength(1);
      expect(ajvErrors[0].code).toBe('SCHEMA_ERROR');
    });

    it('sollte humanizeAjvError für unbekannte keywords verwenden', () => {
      const unknownError = {
        keyword: 'unknown',
        instancePath: '/test',
        message: 'Unknown validation error',
      };

      const humanized = (validator as any).humanizeAjvError(unknownError);
      expect(humanized).toContain('Validierungsfehler in /test');
    });

    it('sollte humanizeAjvError für alle keyword-Typen testen', () => {
      const errorTypes = [
        {
          keyword: 'required',
          instancePath: '/test',
          params: { missingProperty: 'name' },
          expectedText: 'Pflichtfeld fehlt',
        },
        {
          keyword: 'type',
          instancePath: '/test',
          params: { type: 'string' },
          data: 123,
          expectedText: 'Falscher Datentyp',
        },
        {
          keyword: 'minLength',
          instancePath: '/test',
          params: { limit: 5 },
          expectedText: 'zu kurz',
        },
        {
          keyword: 'maxLength',
          instancePath: '/test',
          params: { limit: 10 },
          expectedText: 'zu lang',
        },
        {
          keyword: 'enum',
          instancePath: '/test',
          params: { allowedValues: ['A', 'B'] },
          expectedText: 'Ungültiger Wert',
        },
        {
          keyword: 'format',
          instancePath: '/test',
          params: { format: 'email' },
          expectedText: 'Ungültiges Format',
        },
        {
          keyword: 'minimum',
          instancePath: '/test',
          params: { limit: 0 },
          expectedText: 'zu klein',
        },
      ];

      errorTypes.forEach(({ keyword, instancePath, params, data, expectedText }) => {
        const error = { keyword, instancePath, params, data };
        const humanized = (validator as any).humanizeAjvError(error);
        expect(humanized).toContain(expectedText);
      });
    });

    it('sollte humanizeAjvError für leeren instancePath verwenden', () => {
      const error = {
        keyword: 'required',
        instancePath: '',
        params: { missingProperty: 'name' },
      };

      const humanized = (validator as any).humanizeAjvError(error);
      expect(humanized).toContain('Pflichtfeld fehlt in Root');
    });

    it('sollte detectFormat für partiell vollständige Daten testen', () => {
      // Test mit version und metadata aber ohne einsaetze
      const partialFullData = {
        version: CURRENT_SCHEMA_VERSION,
        metadata: { name: 'Test' },
      };

      const format = (validator as any).detectFormat(partialFullData);
      expect(format).toBe('unknown');
    });

    it('sollte detectFormat für partiell einfache Daten testen', () => {
      // Test mit einsatz aber als Array statt Object
      const partialSimpleData = {
        einsatz: [],
      };

      const format = (validator as any).detectFormat(partialSimpleData);
      expect(format).toBe('simple');
    });

    it('sollte validateEtbEntries mit leeren Einträgen funktionieren', () => {
      const dataWithEmptyEntries = {
        ...validFullFormatData,
        einsaetze: [
          {
            name: 'Test',
            beschreibung: 'Test',
            etbEntries: [],
          },
        ],
      };

      const result = validator.validate(dataWithEmptyEntries);
      expect(result.valid).toBe(true);
      expect(result.metadata.etbEntriesCount).toBe(0);
    });

    it('sollte validateEtbEntries mit Einträgen ohne timestampEreignis funktionieren', () => {
      const dataWithoutTimestamp = {
        ...validFullFormatData,
        einsaetze: [
          {
            name: 'Test',
            beschreibung: 'Test',
            etbEntries: [
              { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test 1', autorId: 'author-1' },
              { laufendeNummer: 2, kategorie: 'MELDUNG', inhalt: 'Test 2', autorId: 'author-2' },
            ],
          },
        ],
      };

      const result = validator.validate(dataWithoutTimestamp);
      expect(result.valid).toBe(true);
      // Sollte keine Timestamp-Warnungen geben
      expect(result.warnings.filter((w) => w.code === 'TIMESTAMP_ORDER')).toHaveLength(0);
    });

    it('sollte validateCommonSemantics mit langen Namen im simple Format testen', () => {
      // Test für coverage der common semantics validateCommonSemantics Methode
      const longName = 'x'.repeat(256);
      const dataWithLongName = {
        einsatz: {
          name: longName,
          beschreibung: 'Test',
        },
      };

      const result = validator.validate(dataWithLongName);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SCHEMA_MAXLENGTH')).toBe(true);
    });

    it('sollte generateMetadata mit mehreren Einsätzen testen', () => {
      const multipleEinsatzData = {
        ...validFullFormatData,
        einsaetze: [
          {
            name: 'Test 1',
            beschreibung: 'Test 1',
            etbEntries: [
              { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test 1', autorId: 'author-1' },
              { laufendeNummer: 2, kategorie: 'MELDUNG', inhalt: 'Test 2', autorId: 'author-2' },
            ],
          },
          {
            name: 'Test 2',
            beschreibung: 'Test 2',
            etbEntries: [
              { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test 3', autorId: 'author-3' },
            ],
          },
        ],
      };

      const result = validator.validate(multipleEinsatzData);
      expect(result.valid).toBe(true);
      expect(result.metadata.einsaetzeCount).toBe(2);
      expect(result.metadata.etbEntriesCount).toBe(3);
    });

    it('sollte generateMetadata mit einfachem Format ohne initialEtbEntries testen', () => {
      const simpleWithoutEtb = {
        einsatz: {
          name: 'Simple Test',
          beschreibung: 'Test',
        },
      };

      const result = validator.validate(simpleWithoutEtb);
      expect(result.valid).toBe(true);
      expect(result.metadata.einsaetzeCount).toBe(1);
      expect(result.metadata.etbEntriesCount).toBe(0);
    });

    it('sollte validateSemantics mit leerem validationLevel testen', () => {
      const dataWithOldVersion = {
        ...validFullFormatData,
        version: '0.0.1',
      };

      const result = validator.validate(dataWithOldVersion, { validationLevel: undefined });
      expect(result.warnings.some((w) => w.code === 'SCHEMA_VERSION_WARNING')).toBe(true);
    });

    it('sollte validateSemantics mit lenient validationLevel testen', () => {
      const dataWithOldVersion = {
        ...validFullFormatData,
        version: '0.0.1',
      };

      const result = validator.validate(dataWithOldVersion, { validationLevel: 'lenient' });
      expect(result.warnings.some((w) => w.code === 'SCHEMA_VERSION_WARNING')).toBe(true);
    });
  });
});
