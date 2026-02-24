import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AnonymisiereAbgelaufeneHandler } from '@/application/aufbewahrung/commands/anonymisiere-abgelaufene/anonymisiere-abgelaufene.handler';
import { LoescheAnonymisierteHandler } from '@/application/aufbewahrung/commands/loesche-anonymisierte/loesche-anonymisierte.handler';
import { GetAufbewahrungsKonfigurationQueryHandler } from '@/application/aufbewahrung/queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsKonfigurationQuery } from '@/application/aufbewahrung/queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.query';
import { AnonymisiereAbgelaufeneCommand } from '@/application/aufbewahrung/commands/anonymisiere-abgelaufene/anonymisiere-abgelaufene.command';
import { LoescheAnonymisierteCommand } from '@/application/aufbewahrung/commands/loesche-anonymisierte/loesche-anonymisierte.command';

/**
 * DSGVO-Aufbewahrungs-Cronjob-Service.
 *
 * Fuehrt taeglich automatische Anonymisierung und Loeschung durch:
 * - 02:00 Uhr: Anonymisierung abgelaufener Befehle
 * - 03:00 Uhr: Loeschung anonymisierter Befehle nach Freigabeperiode
 *
 * Beide Jobs pruefen die Konfiguration (automatischLoeschenAktiv)
 * bevor sie Aenderungen vornehmen.
 *
 * @remarks Story 5.5 AC2, AC3
 */
@Injectable()
export class AufbewahrungsCronService {
  private isAnonymisierungRunning = false;
  private isLoeschungRunning = false;

  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    private readonly anonymisiereHandler: AnonymisiereAbgelaufeneHandler,
    private readonly loescheHandler: LoescheAnonymisierteHandler,
    private readonly konfigurationHandler: GetAufbewahrungsKonfigurationQueryHandler,
  ) {}

  /**
   * Taeglich um 02:00 Uhr: Anonymisierung abgelaufener Befehle.
   */
  @Cron('0 2 * * *', { name: 'aufbewahrung-anonymisierung' })
  async handleAnonymisierung(): Promise<void> {
    if (this.isAnonymisierungRunning) {
      this.logger.warn('Anonymisierung laeuft bereits, ueberspringe', AufbewahrungsCronService.name);
      return;
    }
    this.isAnonymisierungRunning = true;
    try {
      // Pruefen ob automatische Loeschung aktiv
      const konfigResult = await this.konfigurationHandler.execute(new GetAufbewahrungsKonfigurationQuery());
      if (konfigResult.isFailure || !konfigResult.value) {
        this.logger.error('Konfiguration konnte nicht geladen werden', AufbewahrungsCronService.name);
        return;
      }

      if (!konfigResult.value.automatischLoeschenAktiv) {
        this.logger.debug('Automatische Anonymisierung ist deaktiviert', AufbewahrungsCronService.name);
        return;
      }

      this.logger.log('Starte DSGVO-Anonymisierung abgelaufener Befehle...', AufbewahrungsCronService.name);

      const result = await this.anonymisiereHandler.execute(new AnonymisiereAbgelaufeneCommand('SYSTEM'));

      if (result.isFailure) {
        this.logger.error(`Anonymisierung fehlgeschlagen: ${result.error}`, AufbewahrungsCronService.name);
        return;
      }

      const ergebnisse = result.value ?? [];
      if (ergebnisse.length === 0) {
        this.logger.debug('Keine abgelaufenen Befehle zur Anonymisierung gefunden', AufbewahrungsCronService.name);
        return;
      }

      const gesamtBefehle = ergebnisse.reduce((sum, e) => sum + e.befehlCount, 0);
      this.logger.log(`Anonymisierung abgeschlossen: ${ergebnisse.length} Einsaetze, ${gesamtBefehle} Befehle anonymisiert`, AufbewahrungsCronService.name);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fehler in Anonymisierungs-Cronjob: ${msg}`, AufbewahrungsCronService.name);
    } finally {
      this.isAnonymisierungRunning = false;
    }
  }

  /**
   * Taeglich um 03:00 Uhr: Loeschung anonymisierter Befehle nach Freigabeperiode.
   */
  @Cron('0 3 * * *', { name: 'aufbewahrung-loeschung' })
  async handleLoeschung(): Promise<void> {
    if (this.isLoeschungRunning) {
      this.logger.warn('Loeschung laeuft bereits, ueberspringe', AufbewahrungsCronService.name);
      return;
    }
    this.isLoeschungRunning = true;
    try {
      // Pruefen ob automatische Loeschung aktiv
      const konfigResult = await this.konfigurationHandler.execute(new GetAufbewahrungsKonfigurationQuery());
      if (konfigResult.isFailure || !konfigResult.value) {
        this.logger.error('Konfiguration konnte nicht geladen werden', AufbewahrungsCronService.name);
        return;
      }

      if (!konfigResult.value.automatischLoeschenAktiv) {
        this.logger.debug('Automatische Loeschung ist deaktiviert', AufbewahrungsCronService.name);
        return;
      }

      this.logger.log('Starte DSGVO-Loeschung anonymisierter Befehle...', AufbewahrungsCronService.name);

      const result = await this.loescheHandler.execute(new LoescheAnonymisierteCommand('SYSTEM'));

      if (result.isFailure) {
        this.logger.error(`Loeschung fehlgeschlagen: ${result.error}`, AufbewahrungsCronService.name);
        return;
      }

      const ergebnisse = result.value ?? [];
      if (ergebnisse.length === 0) {
        this.logger.debug('Keine anonymisierten Befehle zur Loeschung gefunden', AufbewahrungsCronService.name);
        return;
      }

      const gesamtBefehle = ergebnisse.reduce((sum, e) => sum + e.befehlCount, 0);
      this.logger.log(`Loeschung abgeschlossen: ${ergebnisse.length} Einsaetze, ${gesamtBefehle} Befehle geloescht`, AufbewahrungsCronService.name);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fehler in Loeschungs-Cronjob: ${msg}`, AufbewahrungsCronService.name);
    } finally {
      this.isLoeschungRunning = false;
    }
  }
}
