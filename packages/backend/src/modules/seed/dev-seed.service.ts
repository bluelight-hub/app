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
  ) {}

  /**
   * Wird beim Start der Anwendung ausgeführt.
   * Erstellt einen initialen Einsatz und Admin-Authentifizierungs-Daten,
   * wenn diese nicht vorhanden sind und die Anwendung im Entwicklungsmodus läuft.
   */
  async onModuleInit() {
    // Nur im Entwicklungsmodus ausführen
    if (this.configService.get('NODE_ENV') !== 'development') {
      this.logger.debug('Automatisches Seeding übersprungen (nicht im Dev-Modus)');
      return;
    }

    // Admin-Authentication seeden
    if (this.configService.get('SEED_ADMIN_AUTH') !== 'false') {
      try {
        const adminPassword = this.configService.get('ADMIN_SEED_PASSWORD') || 'admin123';
        const success = await this.seedService.seedAdminAuthentication(adminPassword);

        if (success) {
          this.logger.log('Admin-Authentication erfolgreich geseeded');
          this.logger.warn(`Test-Admin-Benutzer erstellt mit Passwort: ${adminPassword}`);
          this.logger.warn('WICHTIG: Ändern Sie die Passwörter vor dem Produktivbetrieb!');
        } else {
          this.logger.log('Admin-Authentication Seeding übersprungen (existiert bereits)');
        }
      } catch (error) {
        this.logger.error('Fehler beim Seeden der Admin-Authentication:', error);
      }
    }

    // Einsatz seeden
    if (this.configService.get('SEED_INITIAL_EINSATZ') !== 'false') {
      try {
        // Standard-Einsatz erstellen
        const today = new Date().toISOString().split('T')[0];
        const name = this.configService.get('DEV_EINSATZ_NAME') || `Dev-Einsatz ${today}`;
        const beschreibung = 'Automatisch erstellter Entwicklungs-Einsatz';

        const einsatz = await this.seedService.createEinsatzWithRetry(name, beschreibung);

        if (einsatz) {
          this.logger.log(`Initialen Dev-Einsatz erstellt: ${name} (ID: ${einsatz.id})`);
        } else {
          this.logger.log(
            'Kein initialer Einsatz erstellt (existiert bereits oder Fehler aufgetreten)',
          );
        }
      } catch (error) {
        this.logger.error('Fehler beim Erstellen des initialen Einsatzes:', error);
      }
    }

    // Threat Detection Rules seeden
    if (this.configService.get('SEED_THREAT_RULES') !== 'false') {
      try {
        const preset = this.configService.get('THREAT_RULES_PRESET') || 'standard';
        const result = await this.seedService.seedThreatDetectionRules({
          preset: preset as any,
          activate: true,
          skipExisting: true,
        });

        if (result.imported > 0) {
          this.logger.log(
            `Threat Detection Rules erfolgreich geseeded: ${result.imported} Regeln importiert`,
          );
        } else if (result.skipped > 0) {
          this.logger.log(
            `Threat Detection Rules bereits vorhanden: ${result.skipped} Regeln übersprungen`,
          );
        }
      } catch (error) {
        this.logger.error('Fehler beim Seeden der Threat Detection Rules:', error);
      }
    }
  }
}
