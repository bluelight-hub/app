/**
 * Service für den Import von Seed-Daten aus JSON-Dateien.
 * Integriert sich in die bestehende Seed-Architektur mit Transaktionen und Error Handling.
 */

import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { RetryConfig } from '@/common/utils/retry.util';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import {
    EtbEntryStatus,
    ImportConfig,
    ImportResult,
    SeedData,
    SeedEinsatz,
    SeedEtbEntry,
    SimpleSeedData
} from './schema';
import {
    ValidationResult,
    validateSeedDataString
} from './schema-validator';

/**
 * Service für JSON-basierte Seed-Daten-Importe.
 */
@Injectable()
export class SeedImportService {
    private readonly logger = new Logger(SeedImportService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly errorHandlingService: ErrorHandlingService,
    ) { }

    /**
     * Importiert Seed-Daten aus einer JSON-Datei.
     *
     * @param filePath Pfad zur JSON-Datei
     * @param config Import-Konfiguration
     * @returns Import-Ergebnis mit Details
     */
    async importFromFile(filePath: string, config: ImportConfig = {}): Promise<ImportResult> {
        const startTime = Date.now();
        this.logger.log(`Starte JSON-Import aus Datei: ${filePath}`);

        try {
            // 1. Datei lesen und validieren
            const jsonContent = await fs.readFile(filePath, 'utf8');
            const validation = validateSeedDataString(jsonContent, config);

            if (!validation.valid) {
                return this.createErrorResult(
                    validation.errors.map(e => e.message),
                    validation.warnings.map(w => w.message),
                    startTime
                );
            }

            this.logger.log(`JSON-Datei erfolgreich validiert (Format: ${validation.detectedFormat})`);

            // 2. Import durchführen
            return await this.importValidatedData(validation.data!, config, startTime);

        } catch (error) {
            this.logger.error(`Fehler beim Lesen der Datei ${filePath}:`, error);
            return this.createErrorResult(
                [`Datei-Fehler: ${error.message}`],
                [],
                startTime
            );
        }
    }

    /**
     * Importiert bereits validierte Seed-Daten.
     *
     * @param data Validierte Seed-Daten
     * @param config Import-Konfiguration
     * @param startTime Start-Zeitstempel
     * @returns Import-Ergebnis
     */
    private async importValidatedData(
        data: SeedData | SimpleSeedData,
        config: ImportConfig,
        startTime: number
    ): Promise<ImportResult> {
        const result: ImportResult = {
            success: false,
            einsaetzeCreated: 0,
            etbEntriesCreated: 0,
            attachmentsCreated: 0,
            durationMs: 0,
            warnings: [],
            errors: [],
            createdEntities: {
                einsaetze: [],
                etbEntries: []
            }
        };

        try {
            // Pre-Import Setup
            await this.executePreImportSetup(data, config, result);

            if (config.dryRun) {
                this.logger.log('Dry-Run-Modus: Simuliere Import ohne Datenbank-Änderungen');
                return this.simulateImport(data, config, result, startTime);
            }

            // Echter Import mit Transaktion
            await this.executeImportTransaction(data, config, result);

            // Post-Import Cleanup
            await this.executePostImportCleanup(data, config, result);

            result.success = true;
            result.durationMs = Date.now() - startTime;

            this.logger.log(`Import erfolgreich abgeschlossen: ${result.einsaetzeCreated} Einsätze, ${result.etbEntriesCreated} ETB-Einträge`);

        } catch (error) {
            this.logger.error('Import-Fehler:', error);
            result.errors.push(`Import-Fehler: ${error.message}`);
            result.durationMs = Date.now() - startTime;
        }

        return result;
    }

    /**
     * Führt Pre-Import Setup aus.
     */
    private async executePreImportSetup(
        data: SeedData | SimpleSeedData,
        config: ImportConfig,
        result: ImportResult
    ): Promise<void> {
        // Prüfe ob es sich um vollständige Daten handelt
        if ('preImportSetup' in data && data.preImportSetup) {
            const setup = data.preImportSetup;

            // Warnungen anzeigen
            if (setup.warnings) {
                result.warnings.push(...setup.warnings);
                setup.warnings.forEach(warning => {
                    this.logger.warn(`Pre-Import Warnung: ${warning}`);
                });
            }

            // SQL-Befehle ausführen (nur wenn nicht Dry-Run)
            if (setup.sqlCommands && !config.dryRun) {
                for (const sqlCommand of setup.sqlCommands) {
                    this.logger.log(`Führe Pre-Import SQL aus: ${sqlCommand.substring(0, 100)}...`);
                    try {
                        await this.prisma.$executeRawUnsafe(sqlCommand);
                    } catch (error) {
                        this.logger.error(`Pre-Import SQL-Fehler: ${error.message}`);
                        if (config.strictWarnings) {
                            throw new Error(`Pre-Import Setup fehlgeschlagen: ${error.message}`);
                        }
                        result.warnings.push(`Pre-Import SQL-Warnung: ${error.message}`);
                    }
                }
            }
        }
    }

    /**
     * Führt den Import in einer Transaktion aus.
     */
    private async executeImportTransaction(
        data: SeedData | SimpleSeedData,
        config: ImportConfig,
        result: ImportResult
    ): Promise<void> {
        const retryConfig: Partial<RetryConfig> = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            jitterFactor: 0.2,
        };

        await this.errorHandlingService.executeWithErrorHandling(
            async () => {
                return await this.prisma.$transaction(async (tx) => {
                    const einsaetze = this.normalizeToEinsaetzeArray(data);

                    for (const einsatzData of einsaetze) {
                        await this.importSingleEinsatz(einsatzData, config, result, tx);
                    }
                }, {
                    timeout: 60000, // 60 Sekunden Timeout für große Imports
                    isolationLevel: 'Serializable',
                });
            },
            'seed-import-transaction',
            { dataSize: JSON.stringify(data).length },
            retryConfig
        );
    }

    /**
     * Importiert einen einzelnen Einsatz mit allen zugehörigen Daten.
     */
    private async importSingleEinsatz(
        einsatzData: SeedEinsatz,
        config: ImportConfig,
        result: ImportResult,
        tx: any
    ): Promise<void> {
        this.logger.log(`Importiere Einsatz: ${einsatzData.name}`);

        // Einsatz erstellen oder aktualisieren
        const einsatz = await this.createOrUpdateEinsatz(einsatzData, config, tx);

        result.einsaetzeCreated++;
        result.createdEntities.einsaetze.push({
            id: einsatz.id,
            name: einsatz.name
        });

        if (config.progressCallback) {
            config.progressCallback(
                `Einsatz "${einsatz.name}" erstellt`,
                (result.einsaetzeCreated / this.getTotalEinsaetzeCount(einsatzData)) * 100
            );
        }

        // ETB-Einträge importieren
        if (einsatzData.etbEntries && einsatzData.etbEntries.length > 0) {
            await this.importEtbEntries(einsatz.id, einsatzData.etbEntries, config, result, tx);
        }
    }

    /**
     * Erstellt oder aktualisiert einen Einsatz.
     */
    private async createOrUpdateEinsatz(
        einsatzData: SeedEinsatz,
        config: ImportConfig,
        tx: any
    ) {
        // Prüfen ob Einsatz bereits existiert
        const existingEinsatz = await tx.einsatz.findFirst({
            where: { name: einsatzData.name }
        });

        if (existingEinsatz && !config.overwriteConflicts) {
            this.logger.log(`Einsatz "${einsatzData.name}" existiert bereits, verwende existierenden`);
            return existingEinsatz;
        }

        if (existingEinsatz && config.overwriteConflicts) {
            this.logger.log(`Einsatz "${einsatzData.name}" wird aktualisiert`);
            return await tx.einsatz.update({
                where: { id: existingEinsatz.id },
                data: {
                    name: einsatzData.name,
                    beschreibung: einsatzData.beschreibung,
                    updatedAt: new Date()
                }
            });
        }

        // Neuen Einsatz erstellen
        this.logger.log(`Erstelle neuen Einsatz: ${einsatzData.name}`);
        return await tx.einsatz.create({
            data: {
                name: einsatzData.name,
                beschreibung: einsatzData.beschreibung
            }
        });
    }

    /**
     * Importiert ETB-Einträge für einen Einsatz.
     */
    private async importEtbEntries(
        einsatzId: string,
        etbEntries: SeedEtbEntry[],
        config: ImportConfig,
        result: ImportResult,
        tx: any
    ): Promise<void> {
        // ETB-Einträge nach laufender Nummer sortieren
        const sortedEntries = [...etbEntries].sort((a, b) =>
            (a.laufendeNummer || 0) - (b.laufendeNummer || 0)
        );

        let nextLaufendeNummer = await this.getNextLaufendeNummer(einsatzId, tx);

        for (const entryData of sortedEntries) {
            await this.importSingleEtbEntry(
                einsatzId,
                entryData,
                nextLaufendeNummer,
                config,
                result,
                tx
            );
            nextLaufendeNummer++;
        }
    }

    /**
     * Importiert einen einzelnen ETB-Eintrag.
     */
    private async importSingleEtbEntry(
        einsatzId: string,
        entryData: SeedEtbEntry,
        laufendeNummer: number,
        config: ImportConfig,
        result: ImportResult,
        tx: any
    ): Promise<void> {
        const now = new Date();

        // Zeitstempel verarbeiten
        const timestampErstellung = entryData.timestampErstellung
            ? new Date(entryData.timestampErstellung)
            : (config.autoTimestamps ? now : new Date());

        const timestampEreignis = entryData.timestampEreignis
            ? new Date(entryData.timestampEreignis)
            : (config.autoTimestamps ? now : new Date());

        // ETB-Eintrag erstellen
        const etbEntry = await tx.etbEntry.create({
            data: {
                laufendeNummer: entryData.laufendeNummer || laufendeNummer,
                timestampErstellung,
                timestampEreignis,
                autorId: entryData.autorId,
                autorName: entryData.autorName,
                autorRolle: entryData.autorRolle,
                kategorie: entryData.kategorie,
                inhalt: entryData.inhalt,
                referenzEinsatzId: einsatzId,
                referenzPatientId: entryData.referenzPatientId,
                referenzEinsatzmittelId: entryData.referenzEinsatzmittelId,
                systemQuelle: entryData.systemQuelle,
                version: entryData.version || 1,
                status: entryData.status || EtbEntryStatus.AKTIV,
                sender: entryData.sender,
                receiver: entryData.receiver
            }
        });

        result.etbEntriesCreated++;
        result.createdEntities.etbEntries.push({
            id: etbEntry.id,
            laufendeNummer: etbEntry.laufendeNummer,
            einsatzId: einsatzId
        });

        this.logger.debug(`ETB-Eintrag ${etbEntry.laufendeNummer} für Einsatz ${einsatzId} erstellt`);

        // Anhänge importieren
        if (entryData.anlagen && entryData.anlagen.length > 0) {
            for (const anhang of entryData.anlagen) {
                await tx.etbAttachment.create({
                    data: {
                        etbEntryId: etbEntry.id,
                        dateiname: anhang.dateiname,
                        dateityp: anhang.dateityp,
                        speicherOrt: anhang.speicherOrt,
                        beschreibung: anhang.beschreibung
                    }
                });
                result.attachmentsCreated++;
            }
        }
    }

    /**
     * Führt Post-Import Cleanup aus.
     */
    private async executePostImportCleanup(
        data: SeedData | SimpleSeedData,
        config: ImportConfig,
        result: ImportResult
    ): Promise<void> {
        if ('postImportCleanup' in data && data.postImportCleanup) {
            const cleanup = data.postImportCleanup;

            // SQL-Befehle ausführen
            if (cleanup.sqlCommands) {
                for (const sqlCommand of cleanup.sqlCommands) {
                    this.logger.log(`Führe Post-Import SQL aus: ${sqlCommand.substring(0, 100)}...`);
                    try {
                        await this.prisma.$executeRawUnsafe(sqlCommand);
                    } catch (error) {
                        this.logger.error(`Post-Import SQL-Fehler: ${error.message}`);
                        result.warnings.push(`Post-Import SQL-Warnung: ${error.message}`);
                    }
                }
            }

            // Validierungsschritte ausführen
            if (cleanup.validationSteps) {
                for (const step of cleanup.validationSteps) {
                    this.logger.log(`Validierungsschritt: ${step}`);
                    // Hier könnten spezifische Validierungen implementiert werden
                }
            }
        }
    }

    /**
     * Simuliert einen Import im Dry-Run-Modus.
     */
    private async simulateImport(
        data: SeedData | SimpleSeedData,
        config: ImportConfig,
        result: ImportResult,
        startTime: number
    ): Promise<ImportResult> {
        const einsaetze = this.normalizeToEinsaetzeArray(data);

        result.einsaetzeCreated = einsaetze.length;
        result.etbEntriesCreated = einsaetze.reduce((sum, einsatz) =>
            sum + (einsatz.etbEntries?.length || 0), 0
        );
        result.attachmentsCreated = einsaetze.reduce((sum, einsatz) =>
            sum + (einsatz.etbEntries?.reduce((attachSum, entry) =>
                attachSum + (entry.anlagen?.length || 0), 0) || 0), 0
        );

        result.success = true;
        result.durationMs = Date.now() - startTime;
        result.warnings.push('Dry-Run durchgeführt - keine Datenbank-Änderungen');

        return result;
    }

    /**
     * Hilfsmethoden
     */

    private normalizeToEinsaetzeArray(data: SeedData | SimpleSeedData): SeedEinsatz[] {
        if ('einsaetze' in data) {
            return data.einsaetze;
        } else {
            // Vereinfachtes Format zu vollständigem Format konvertieren
            const seedEinsatz: SeedEinsatz = {
                name: data.einsatz.name,
                beschreibung: data.einsatz.beschreibung
            };

            if (data.initialEtbEntries) {
                seedEinsatz.etbEntries = data.initialEtbEntries.map((entry, index) => ({
                    laufendeNummer: index + 1,
                    autorId: entry.autorId,
                    autorName: entry.autorName,
                    kategorie: entry.kategorie,
                    inhalt: entry.inhalt,
                    timestampEreignis: entry.timestampEreignis
                }));
            }

            return [seedEinsatz];
        }
    }

    private getTotalEinsaetzeCount(data: any): number {
        return 1; // Da wir pro Einsatz aufrufen
    }

    private async getNextLaufendeNummer(einsatzId: string, tx: any): Promise<number> {
        const lastEntry = await tx.etbEntry.findFirst({
            where: { referenzEinsatzId: einsatzId },
            orderBy: { laufendeNummer: 'desc' }
        });

        return (lastEntry?.laufendeNummer || 0) + 1;
    }

    private createErrorResult(
        errors: string[],
        warnings: string[],
        startTime: number
    ): ImportResult {
        return {
            success: false,
            einsaetzeCreated: 0,
            etbEntriesCreated: 0,
            attachmentsCreated: 0,
            durationMs: Date.now() - startTime,
            warnings,
            errors,
            createdEntities: {
                einsaetze: [],
                etbEntries: []
            }
        };
    }

    /**
     * Validiert eine JSON-Datei ohne Import.
     */
    async validateFile(filePath: string, config: ImportConfig = {}): Promise<ValidationResult> {
        try {
            const jsonContent = await fs.readFile(filePath, 'utf8');
            return validateSeedDataString(jsonContent, config);
        } catch (error) {
            return {
                valid: false,
                errors: [{
                    code: 'FILE_READ_ERROR',
                    message: `Datei konnte nicht gelesen werden: ${error.message}`,
                    severity: 'error'
                }],
                warnings: [],
                detectedFormat: 'unknown',
                metadata: {
                    einsaetzeCount: 0,
                    etbEntriesCount: 0,
                    estimatedSizeBytes: 0
                }
            };
        }
    }
} 