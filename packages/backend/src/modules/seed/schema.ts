/**
 * JSON Schema für Seed-Daten Import/Export.
 * Dieses Schema definiert die Struktur für komplexe Seed-Szenarien.
 */

import { DRKEinsatzCategory } from './profiles';

/**
 * ETB Kategorien (entspricht Prisma enum EtbKategorie).
 */
export enum EtbKategorie {
    LAGEMELDUNG = 'LAGEMELDUNG',
    MELDUNG = 'MELDUNG',
    ANFORDERUNG = 'ANFORDERUNG',
    KORREKTUR = 'KORREKTUR',
    AUTO_KRAEFTE = 'AUTO_KRAEFTE',
    AUTO_PATIENTEN = 'AUTO_PATIENTEN',
    AUTO_TECHNISCH = 'AUTO_TECHNISCH',
    AUTO_SONSTIGES = 'AUTO_SONSTIGES',
}

/**
 * ETB Entry Status (entspricht Prisma enum EtbEntryStatus).
 */
export enum EtbEntryStatus {
    AKTIV = 'AKTIV',
    UEBERSCHRIEBEN = 'UEBERSCHRIEBEN',
}

/**
 * Basis-Interface für alle Seed-Entitäten.
 */
export interface BaseSeedEntity {
    /** Optional: Eindeutige ID für Referenzierung */
    id?: string;
    /** Optional: Metadaten für Import-Prozess */
    _meta?: {
        /** Beschreibung der Entität */
        description?: string;
        /** Tags für Kategorisierung */
        tags?: string[];
        /** Import-Anweisungen */
        importNotes?: string;
    };
}

/**
 * Einsatz-Daten für JSON Import.
 */
export interface SeedEinsatz extends BaseSeedEntity {
    /** Name des Einsatzes (eindeutig) */
    name: string;
    /** Optionale Beschreibung */
    beschreibung?: string;
    /** ETB-Einträge für diesen Einsatz */
    etbEntries?: SeedEtbEntry[];
}

/**
 * ETB-Eintrag für JSON Import.
 */
export interface SeedEtbEntry extends BaseSeedEntity {
    /** Laufende Nummer (wird automatisch generiert wenn nicht angegeben) */
    laufendeNummer?: number;
    /** Zeitstempel der Erstellung (ISO 8601 Format) */
    timestampErstellung?: string;
    /** Zeitstempel des Ereignisses (ISO 8601 Format) */
    timestampEreignis?: string;
    /** Autor-ID */
    autorId: string;
    /** Optional: Autor-Name */
    autorName?: string;
    /** Optional: Autor-Rolle */
    autorRolle?: string;
    /** Kategorie des ETB-Eintrags */
    kategorie: EtbKategorie;
    /** Inhalt des Eintrags */
    inhalt: string;
    /** Optional: Referenz auf Patient */
    referenzPatientId?: string;
    /** Optional: Referenz auf Einsatzmittel */
    referenzEinsatzmittelId?: string;
    /** Optional: System-Quelle */
    systemQuelle?: string;
    /** Optional: Version */
    version?: number;
    /** Optional: Status */
    status?: EtbEntryStatus;
    /** Optional: Sender */
    sender?: string;
    /** Optional: Empfänger */
    receiver?: string;
    /** Optional: Anlagen für diesen ETB-Eintrag */
    anlagen?: SeedEtbAttachment[];
}

/**
 * ETB-Anhang für JSON Import.
 */
export interface SeedEtbAttachment extends BaseSeedEntity {
    /** Dateiname */
    dateiname: string;
    /** Dateityp/MIME-Type */
    dateityp: string;
    /** Speicherort (Pfad oder URL) */
    speicherOrt: string;
    /** Optional: Beschreibung */
    beschreibung?: string;
}

/**
 * Umfassende Seed-Daten-Struktur.
 * Kann einen oder mehrere Einsätze mit allen zugehörigen Daten enthalten.
 */
export interface SeedData {
    /** Schema-Version für Kompatibilität */
    version: string;
    /** Metadaten für das gesamte Seed-Set */
    metadata: {
        /** Name/Titel des Seed-Sets */
        name: string;
        /** Beschreibung des Szenarios */
        description: string;
        /** Autor des Seed-Sets */
        author?: string;
        /** Erstellungsdatum */
        createdAt?: string;
        /** DRK-spezifische Kategorisierung */
        category?: DRKEinsatzCategory;
        /** Geschätzte Anzahl betroffener Personen */
        estimatedPersonsAffected?: number;
        /** Geschätzte Einsatzdauer in Stunden */
        estimatedDurationHours?: number;
        /** Benötigte Ressourcen */
        requiredResources?: string[];
        /** Prioritätsstufe */
        priority?: 'low' | 'medium' | 'high' | 'critical';
        /** Tags für Suche und Filterung */
        tags?: string[];
        /** Kompatibilitäts-Hinweise */
        compatibility?: {
            /** Minimum erforderliche Schema-Version */
            minSchemaVersion?: string;
            /** Besondere Anforderungen */
            requirements?: string[];
        };
    };
    /** Einsatz-Daten */
    einsaetze: SeedEinsatz[];
    /** Optional: Setup-Anweisungen vor dem Import */
    preImportSetup?: {
        /** SQL-Befehle die vor dem Import ausgeführt werden */
        sqlCommands?: string[];
        /** Konfigurationsänderungen */
        configChanges?: Record<string, any>;
        /** Warnungen für den Benutzer */
        warnings?: string[];
    };
    /** Optional: Cleanup-Anweisungen nach dem Import */
    postImportCleanup?: {
        /** SQL-Befehle die nach dem Import ausgeführt werden */
        sqlCommands?: string[];
        /** Validierungsschritte */
        validationSteps?: string[];
    };
}

/**
 * Vereinfachtes Seed-Format für schnelle Einsatz-Erstellung.
 * Kompatibel mit bestehenden Profilen.
 */
export interface SimpleSeedData {
    /** Einsatz-Informationen */
    einsatz: {
        name: string;
        beschreibung?: string;
    };
    /** Optional: Basis ETB-Einträge */
    initialEtbEntries?: Array<{
        autorId: string;
        autorName?: string;
        kategorie: EtbKategorie;
        inhalt: string;
        timestampEreignis?: string;
    }>;
}

/**
 * Konfiguration für den Import-Prozess.
 */
export interface ImportConfig {
    /** Soll bei Konflikten überschrieben werden? */
    overwriteConflicts?: boolean;
    /** Soll ein Dry-Run durchgeführt werden? */
    dryRun?: boolean;
    /** Validierungs-Level */
    validationLevel?: 'strict' | 'moderate' | 'lenient';
    /** Sollen automatische Zeitstempel gesetzt werden? */
    autoTimestamps?: boolean;
    /** Basis-Autor für ETB-Einträge ohne Autor */
    defaultAutor?: {
        id: string;
        name: string;
        rolle: string;
    };
    /** Callback für Fortschritts-Updates */
    progressCallback?: (step: string, progress: number) => void;
    /** Sollen Warnings als Errors behandelt werden? */
    strictWarnings?: boolean;
}

/**
 * Ergebnis eines Import-Prozesses.
 */
export interface ImportResult {
    /** War der Import erfolgreich? */
    success: boolean;
    /** Anzahl erstellter Einsätze */
    einsaetzeCreated: number;
    /** Anzahl erstellter ETB-Einträge */
    etbEntriesCreated: number;
    /** Anzahl erstellter Anhänge */
    attachmentsCreated: number;
    /** Import-Dauer in Millisekunden */
    durationMs: number;
    /** Warnungen während des Imports */
    warnings: string[];
    /** Fehler während des Imports */
    errors: string[];
    /** Erstelle Entitäten mit IDs */
    createdEntities: {
        einsaetze: Array<{ id: string; name: string }>;
        etbEntries: Array<{ id: string; laufendeNummer: number; einsatzId: string }>;
    };
    /** Optional: Rollback-Informationen */
    rollbackInfo?: {
        /** Können Änderungen rückgängig gemacht werden? */
        canRollback: boolean;
        /** Rollback-Token für Identifikation */
        rollbackToken?: string;
    };
}

/**
 * JSON Schema Definition für Validierung.
 * Wird für die strukturelle Validierung der JSON-Dateien verwendet.
 */
export const SEED_DATA_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Bluelight-Hub Seed Data',
    description: 'Schema für Seed-Daten Import in Bluelight-Hub',
    type: 'object',
    required: ['version', 'metadata', 'einsaetze'],
    properties: {
        version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            description: 'Semantic version der Schema-Version'
        },
        metadata: {
            type: 'object',
            required: ['name', 'description'],
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                description: { type: 'string', minLength: 1 },
                author: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                category: {
                    type: 'string',
                    enum: Object.values(DRKEinsatzCategory)
                },
                estimatedPersonsAffected: { type: 'number', minimum: 0 },
                estimatedDurationHours: { type: 'number', minimum: 0 },
                requiredResources: {
                    type: 'array',
                    items: { type: 'string' }
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical']
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        },
        einsaetze: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                required: ['name'],
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    beschreibung: { type: 'string' },
                    etbEntries: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['autorId', 'kategorie', 'inhalt'],
                            properties: {
                                id: { type: 'string' },
                                laufendeNummer: { type: 'number', minimum: 1 },
                                timestampErstellung: { type: 'string', format: 'date-time' },
                                timestampEreignis: { type: 'string', format: 'date-time' },
                                autorId: { type: 'string', minLength: 1 },
                                autorName: { type: 'string' },
                                autorRolle: { type: 'string' },
                                kategorie: {
                                    type: 'string',
                                    enum: Object.values(EtbKategorie)
                                },
                                inhalt: { type: 'string', minLength: 1 },
                                referenzPatientId: { type: 'string' },
                                referenzEinsatzmittelId: { type: 'string' },
                                systemQuelle: { type: 'string' },
                                version: { type: 'number', minimum: 1 },
                                status: {
                                    type: 'string',
                                    enum: Object.values(EtbEntryStatus)
                                },
                                sender: { type: 'string' },
                                receiver: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }
} as const;

/**
 * JSON Schema für vereinfachtes Seed-Format.
 */
export const SIMPLE_SEED_DATA_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Bluelight-Hub Simple Seed Data',
    description: 'Vereinfachtes Schema für schnelle Einsatz-Erstellung',
    type: 'object',
    required: ['einsatz'],
    properties: {
        einsatz: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string', minLength: 1, maxLength: 255 },
                beschreibung: { type: 'string' }
            }
        },
        initialEtbEntries: {
            type: 'array',
            items: {
                type: 'object',
                required: ['autorId', 'kategorie', 'inhalt'],
                properties: {
                    autorId: { type: 'string', minLength: 1 },
                    autorName: { type: 'string' },
                    kategorie: {
                        type: 'string',
                        enum: Object.values(EtbKategorie)
                    },
                    inhalt: { type: 'string', minLength: 1 },
                    timestampEreignis: { type: 'string', format: 'date-time' }
                }
            }
        }
    }
} as const;

/**
 * Aktuelle Schema-Version.
 */
export const CURRENT_SCHEMA_VERSION = '1.0.0';

/**
 * Unterstützte Schema-Versionen.
 */
export const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0']; 