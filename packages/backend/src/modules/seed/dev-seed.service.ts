import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';

/**
 * Service zur automatischen Datenbankinitialisierung im Entwicklungsmodus
 *
 * Dieser Service kümmert sich um das automatische Erstellen von Testdaten
 * beim Start der Anwendung im Entwicklungsmodus. Er erstellt:
 * - Admin-Benutzer mit Standard-Credentials
 * - Initialen Einsatz für Entwicklungszwecke
 * - Standard Threat Detection Rules
 *
 * Der Service wird nur im Entwicklungsmodus aktiv und kann über
 * Umgebungsvariablen konfiguriert werden.
 *
 * @class DevSeedService
 * @implements {OnModuleInit}
 *
 * @example
 * ```typescript
 * // Konfiguration über .env Datei:
 * // NODE_ENV=development
 * // SEED_ADMIN_AUTH=true
 * // ADMIN_SEED_PASSWORD=securePassword123
 * // SEED_INITIAL_EINSATZ=true
 * // DEV_EINSATZ_NAME=Test-Einsatz-2024
 * // SEED_THREAT_RULES=true
 * // THREAT_RULES_PRESET=strict
 * ```
 */
@Injectable()
export class DevSeedService implements OnModuleInit {
  /**
   * Logger-Instanz für Service-Meldungen
   * @private
   * @property {Logger} logger
   */
  private readonly logger = new Logger(DevSeedService.name);

  /**
   * Konstruktor des DevSeedService
   *
   * @param {SeedService} seedService - Service für Seed-Operationen
   * @param {ConfigService} configService - Service für Konfigurationszugriff
   */
  constructor(
    private readonly seedService: SeedService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Lifecycle-Hook der beim Modulstart ausgeführt wird
   *
   * Führt das automatische Seeding der Datenbank durch, wenn die
   * Anwendung im Entwicklungsmodus läuft. Die Methode prüft die
   * Umgebungsvariablen und erstellt entsprechend:
   * - Admin-Authentifizierung
   * - Initialen Einsatz
   * - Threat Detection Rules
   *
   * @returns {Promise<void>} Promise ohne Rückgabewert
   * @throws {Error} Fehler werden geloggt, aber nicht weitergegeben
   *
   * @example
   * ```typescript
   * // Wird automatisch beim Modulstart aufgerufen
   * // Ausgabe im Log:
   * // [DevSeedService] Admin-Authentication erfolgreich geseeded
   * // [DevSeedService] Test-Admin-Benutzer erstellt mit Passwort: admin123
   * // [DevSeedService] Initialen Dev-Einsatz erstellt: Dev-Einsatz 2024-01-15
   * // [DevSeedService] Threat Detection Rules erfolgreich geseeded: 15 Regeln importiert
   * ```
   */
  async onModuleInit(): Promise<void> {
    // Nur im Entwicklungsmodus ausführen
    if (this.configService.get('NODE_ENV') !== 'development') {
      this.logger.debug('Automatisches Seeding übersprungen (nicht im Dev-Modus)');
      return;
    }

    // Admin-Authentication seeden
    await this.seedAdminAuthentication();

    // Einsatz seeden
    await this.seedInitialEinsatz();

    // Threat Detection Rules seeden
    await this.seedThreatDetectionRules();
  }

  /**
   * Erstellt Admin-Authentifizierungsdaten
   *
   * Erstellt einen Admin-Benutzer mit Standard-Credentials, wenn noch
   * kein Admin existiert. Das Passwort kann über die Umgebungsvariable
   * ADMIN_SEED_PASSWORD konfiguriert werden.
   *
   * @private
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Erstellt Admin mit:
   * // - E-Mail: admin@bluelight-hub.com
   * // - Passwort: aus ADMIN_SEED_PASSWORD oder 'admin123'
   * // - Rolle: ADMIN
   * ```
   */
  private async seedAdminAuthentication(): Promise<void> {
    if (this.configService.get('SEED_ADMIN_AUTH') === 'false') {
      this.logger.debug('Admin-Authentication Seeding deaktiviert');
      return;
    }

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

  /**
   * Erstellt einen initialen Einsatz für Entwicklungszwecke
   *
   * Erstellt einen Einsatz mit dem aktuellen Datum, wenn noch kein
   * Einsatz existiert. Der Name kann über die Umgebungsvariable
   * DEV_EINSATZ_NAME konfiguriert werden.
   *
   * @private
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Erstellt Einsatz mit:
   * // - Name: aus DEV_EINSATZ_NAME oder 'Dev-Einsatz YYYY-MM-DD'
   * // - Beschreibung: 'Automatisch erstellter Entwicklungs-Einsatz'
   * // - Status: AKTIV
   * ```
   */
  private async seedInitialEinsatz(): Promise<void> {
    if (this.configService.get('SEED_INITIAL_EINSATZ') === 'false') {
      this.logger.debug('Einsatz Seeding deaktiviert');
      return;
    }

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

  /**
   * Importiert Standard Threat Detection Rules
   *
   * Lädt vordefinierte Sicherheitsregeln für die Erkennung von
   * Bedrohungen. Das Preset kann über die Umgebungsvariable
   * THREAT_RULES_PRESET konfiguriert werden.
   *
   * @private
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Verfügbare Presets:
   * // - 'standard': Basis-Regeln für normale Sicherheit
   * // - 'strict': Erweiterte Regeln für hohe Sicherheit
   * // - 'minimal': Minimale Regeln für Tests
   *
   * // Importiert Regeln für:
   * // - Brute-Force-Angriffe
   * // - Geo-Anomalien
   * // - Verdächtige User-Agents
   * // - Session-Hijacking
   * // etc.
   * ```
   */
  private async seedThreatDetectionRules(): Promise<void> {
    if (this.configService.get('SEED_THREAT_RULES') === 'false') {
      this.logger.debug('Threat Rules Seeding deaktiviert');
      return;
    }

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
