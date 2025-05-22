import {EinsatzService} from '@/modules/einsatz/einsatz.service';
import {PrismaService} from '@/prisma/prisma.service';
import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {DatabaseCheckService} from './database-check.service';

/**
 * Service zum Seeden der Datenbank mit initialen Daten.
 * Unterstützt Transaktionen, Fehlerbehandlung und Wiederholungslogik.
 */
@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);
    private readonly maxRetries = 3;
    private readonly retryDelay = 1000; // 1 Sekunde zwischen Wiederholungsversuchen

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly databaseCheckService: DatabaseCheckService,
        private readonly einsatzService: EinsatzService,
    ) {
    }

    /**
     * Führt den Seeding-Prozess mit Transaktionen und Wiederholungslogik aus.
     *
     * @param seedFunction Die auszuführende Seed-Funktion
     * @returns true, wenn der Seed-Prozess erfolgreich war, sonst false
     */
    async executeWithTransaction<T>(
        seedFunction: () => Promise<T>,
    ): Promise<boolean> {
        let retries = 0;

        while (retries < this.maxRetries) {
            try {
                // Transaktion starten
                const result = await this.prisma.$transaction(async (tx) => {
                    // Seed-Funktion ausführen
                    return await seedFunction();
                }, {
                    // PostgreSQL-spezifische Transaktionsoptionen
                    timeout: 30000, // 30 Sekunden Timeout
                    isolationLevel: 'Serializable', // Höchstes Isolationslevel für Konsistenz
                });

                this.logger.log('Seed-Transaktion erfolgreich abgeschlossen');
                return true;
            } catch (error) {
                retries++;
                const isLastAttempt = retries >= this.maxRetries;

                // Fehlerbehandlung basierend auf PostgreSQL-spezifischen Fehlercodes
                if (error.code === '23505') { // Unique constraint violation
                    this.logger.warn('Seed-Prozess abgebrochen: Datensatz existiert bereits');
                    return false;
                } else if (error.code === '40P01' && !isLastAttempt) { // Deadlock detected
                    this.logger.warn(`Deadlock erkannt, Wiederholungsversuch ${retries}/${this.maxRetries}`);
                    await this.delay(this.retryDelay * retries); // Exponentielles Backoff
                    continue;
                } else if (error.code === '57014') { // Query timeout
                    this.logger.error('Seed-Prozess: Abfrage-Timeout');
                } else {
                    this.logger.error('Fehler während des Seed-Prozesses:', error);
                }

                if (isLastAttempt) {
                    this.logger.error(`Seed-Prozess nach ${this.maxRetries} Versuchen fehlgeschlagen`);
                    return false;
                }

                await this.delay(this.retryDelay);
            }
        }

        return false;
    }

    /**
     * Erstellt einen initialen Einsatz, wenn keiner existiert.
     *
     * @param name Name des zu erstellenden Einsatzes
     * @param beschreibung Optionale Beschreibung
     * @returns Der erstellte Einsatz oder null bei Fehler
     */
    async seedInitialEinsatz(
        name: string,
        beschreibung?: string,
    ) {
        // Prüfen, ob bereits Einsätze existieren
        const einsatzCount = await this.prisma.einsatz.count();
        if (einsatzCount > 0) {
            this.logger.log('Einsätze bereits vorhanden, überspringe Seed');
            return null;
        }

        // Seed in einer Transaktion ausführen
        const success = await this.executeWithTransaction(async () => {
            this.logger.log(`Erstelle initialen Einsatz: ${name}`);

            const einsatz = await this.einsatzService.create({
                name,
                beschreibung,
            });

            this.logger.log(`Einsatz erstellt mit ID: ${einsatz.id}`);
            return einsatz;
        });

        if (!success) {
            this.logger.error('Fehler beim Erstellen des initialen Einsatzes');
            return null;
        }

        return await this.prisma.einsatz.findFirst({
            where: {name},
        });
    }

    /**
     * Hilfsfunktion für Verzögerungen.
     *
     * @param ms Verzögerung in Millisekunden
     */
    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
} 