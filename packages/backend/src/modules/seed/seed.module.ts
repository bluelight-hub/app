import { EinsatzModule } from '@/modules/einsatz/einsatz.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseCheckService } from './database-check.service';
import { DevSeedService } from './dev-seed.service';
import { ProfileService } from './profile.service';
import { SeedImportService } from './seed-import.service';
import { SeedService } from './seed.service';
import { ThreatRulesSeedService } from './threat-rules-seed.service';
import { ErrorHandlingService } from '@/common/services/error-handling.service';

/**
 * Konfigurationsoptionen für das SeedModule
 *
 * Diese Schnittstelle definiert die möglichen Optionen zur
 * Konfiguration des Seed-Moduls beim Start der Anwendung.
 *
 * @interface SeedModuleOptions
 */
export interface SeedModuleOptions {
  /**
   * Ob der Seeding-Prozess aktiviert werden soll.
   * Standardmäßig nur im Entwicklungsmodus aktiviert.
   */
  enabled?: boolean;

  /**
   * Name des zu erstellenden Dev-Einsatzes.
   * Wenn nicht angegeben, wird ein Name mit aktuellem Datum generiert.
   */
  devEinsatzName?: string;

  /**
   * Beschreibung des zu erstellenden Dev-Einsatzes.
   */
  devEinsatzBeschreibung?: string;
}

/**
 * Seed-Modul für die Initialisierung von Testdaten
 *
 * Dieses Modul stellt Services für das automatische Befüllen
 * der Datenbank mit Testdaten bereit. Es wird hauptsächlich
 * in der Entwicklungsumgebung verwendet und kann über
 * Umgebungsvariablen konfiguriert werden.
 *
 * Features:
 * - Automatische Erstellung von Entwicklungs-Einsätzen
 * - Import von Testdaten aus JSON-Dateien
 * - Vordefinierte Benutzerprofile für Tests
 * - Datenbankstatus-Prüfung vor Seeding
 * - Konfigurierbare Aktivierung über Umgebungsvariablen
 *
 * @module SeedModule
 */
@Module({
  imports: [PrismaModule, EinsatzModule, ConfigModule],
  providers: [
    DatabaseCheckService,
    SeedService,
    DevSeedService,
    ProfileService,
    SeedImportService,
    ThreatRulesSeedService,
    ErrorHandlingService,
  ],
  exports: [SeedService, DevSeedService, ProfileService, SeedImportService, ThreatRulesSeedService],
})
export class SeedModule {
  /**
   * Registriert das SeedModule mit den angegebenen Optionen.
   *
   * @param options Konfigurationsoptionen für das Seed-Modul
   * @returns Ein DynamicModule
   */
  static register(options: SeedModuleOptions = {}): DynamicModule {
    return {
      module: SeedModule,
      providers: [
        {
          provide: 'SEED_OPTIONS',
          useValue: options,
        },
        DatabaseCheckService,
        SeedService,
        DevSeedService,
        ProfileService,
        SeedImportService,
        ThreatRulesSeedService,
        ErrorHandlingService,
        ...(SeedModule.shouldRegisterDevSeed(options) ? [DevSeedService] : []),
      ],
      exports: [
        SeedService,
        DevSeedService,
        ProfileService,
        SeedImportService,
        ThreatRulesSeedService,
      ],
    };
  }

  /**
   * Registriert das SeedModule mit Konfiguration aus der ConfigService.
   *
   * @returns Ein DynamicModule
   */
  static registerAsync(): DynamicModule {
    return {
      module: SeedModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SEED_OPTIONS',
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const isDevelopment = configService.get('NODE_ENV') === 'development';
            const seedEnabled = configService.get('SEED_INITIAL_EINSATZ') !== 'false';

            return {
              enabled: isDevelopment && seedEnabled,
              devEinsatzName: configService.get('DEV_EINSATZ_NAME'),
              devEinsatzBeschreibung: 'Automatisch erstellter Entwicklungs-Einsatz',
            };
          },
        },
        DatabaseCheckService,
        SeedService,
        DevSeedService,
        ProfileService,
        SeedImportService,
        ThreatRulesSeedService,
        ErrorHandlingService,
        // DevSeedService is already included in the providers array above
      ],
      exports: [
        SeedService,
        DevSeedService,
        ProfileService,
        SeedImportService,
        ThreatRulesSeedService,
      ],
    };
  }

  /**
   * Bestimmt, ob der DevSeedService registriert werden sollte.
   *
   * @param options Die Konfigurationsoptionen
   * @returns true, wenn der DevSeedService registriert werden sollte
   */
  private static shouldRegisterDevSeed(options: SeedModuleOptions): boolean {
    // Wenn enabled explizit gesetzt ist, verwende diesen Wert
    if (options.enabled !== undefined) {
      return options.enabled;
    }

    // Sonst aktiviere nur im Entwicklungsmodus
    return process.env.NODE_ENV === 'development' && process.env.SEED_INITIAL_EINSATZ !== 'false';
  }
}
