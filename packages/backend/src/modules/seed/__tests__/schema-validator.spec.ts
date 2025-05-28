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
                expect(result.errors.some(e => e.code === 'UNKNOWN_FORMAT')).toBe(true);
            });

            it('sollte falsche Datentypen erkennen', () => {
                const invalidData = {
                    ...validFullFormatData,
                    version: 123, // sollte string sein
                };

                const result = validator.validate(invalidData);

                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.code.includes('SCHEMA_TYPE'))).toBe(true);
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

                expect(result.warnings.some(w => w.code === 'SCHEMA_VERSION_WARNING')).toBe(true);
            });

            it('sollte nicht unterstützte Schema-Version als Fehler bei strict mode', () => {
                const dataWithOldVersion = {
                    ...validFullFormatData,
                    version: '0.0.1',
                };

                const result = validator.validate(dataWithOldVersion, { validationLevel: 'strict' });

                expect(result.errors.some(e => e.code === 'UNSUPPORTED_SCHEMA_VERSION')).toBe(true);
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

                expect(result.errors.some(e => e.code === 'DUPLICATE_EINSATZ_NAMES')).toBe(true);
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

                expect(result.errors.some(e => e.code === 'DUPLICATE_LAUFENDE_NUMMER')).toBe(true);
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

                expect(result.warnings.some(w => w.code === 'TIMESTAMP_ORDER')).toBe(true);
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
                expect(result.errors.some(e => e.code === 'SCHEMA_MAXLENGTH')).toBe(true);
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

                expect(result.warnings.some(w => w.code === 'LARGE_DATASET')).toBe(true);
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
                expect(result.errors.some(e => e.code === 'VALIDATION_EXCEPTION')).toBe(true);
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
                expect(result.errors.some(e => e.code === 'JSON_PARSE_ERROR')).toBe(true);
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
                        version: 123 // type error - should be string
                    },
                    expectedErrorType: 'SCHEMA_TYPE',
                },
                {
                    data: {
                        version: CURRENT_SCHEMA_VERSION,
                        metadata: {}, // missing required fields
                        einsaetze: []
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
            ];

            testCases.forEach(({ data, expectedErrorType }) => {
                const result = validator.validate(data);
                expect(result.valid).toBe(false);
                expect(result.errors.some(e => e.code.includes(expectedErrorType))).toBe(true);
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
                            { laufendeNummer: 1, kategorie: 'MELDUNG', inhalt: 'Test mit Nummer', autorId: 'author-2' },
                        ],
                    },
                ],
            };

            const result = validator.validate(dataWithoutNumbers);
            // Sollte keine Fehler wegen fehlender Nummern geben
            expect(result.errors.filter(e => e.code === 'DUPLICATE_LAUFENDE_NUMMER')).toHaveLength(0);
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
    });
}); 