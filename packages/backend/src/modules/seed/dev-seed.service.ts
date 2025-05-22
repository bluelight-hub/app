import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';

/**
 * Service zur automatischen Erstellung eines initialen Einsatzes im Entwicklungsmodus.
 * Wird nur ausgeführt, wenn die Anwendung im Entwicklungsmodus läuft und
 * keine Einsätze in der Datenbank existieren.
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
    private readonly logger = new Logger(DevSeedService.name);

    constructor(
        private readonly seedService: SeedService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Wird beim Start der Anwendung ausgeführt.
     * Erstellt einen initialen Einsatz, wenn keiner vorhanden ist und
     * die Anwendung im Entwicklungsmodus läuft.
     */
    async onModuleInit() {
        // Nur im Entwicklungsmodus ausführen
        if (
            this.configService.get('NODE_ENV') !== 'development' ||
            this.configService.get('SEED_INITIAL_EINSATZ') === 'false'
        ) {
            this.logger.debug(
                'Automatische Erstellung eines initialen Einsatzes übersprungen (nicht im Dev-Modus oder deaktiviert)',
            );
            return;
        }

        try {
            // Standard-Einsatz erstellen
            const today = new Date().toISOString().split('T')[0];
            const name =
                this.configService.get('DEV_EINSATZ_NAME') || `Dev-Einsatz ${today}`;
            const beschreibung = 'Automatisch erstellter Entwicklungs-Einsatz';

            const einsatz = await this.seedService.seedInitialEinsatz(name, beschreibung);

            if (einsatz) {
                this.logger.log(`Initialen Dev-Einsatz erstellt: ${name} (ID: ${einsatz.id})`);
            } else {
                this.logger.log('Kein initialer Einsatz erstellt (existiert bereits oder Fehler aufgetreten)');
            }
        } catch (error) {
            this.logger.error('Fehler beim Erstellen des initialen Einsatzes:', error);
        }
    }
} 