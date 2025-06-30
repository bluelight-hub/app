import { CommonModule } from '@/common/common.module';
import { EinsatzModule } from '@/modules/einsatz/einsatz.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseCheckService } from './database-check.service';
import { DevSeedService } from './dev-seed.service';
import { ProfileService } from './profile.service';
import { SeedImportService } from './seed-import.service';
import { SeedService } from './seed.service';

/**
 * Options für das SeedModule.
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
 * Modul zur Verwaltung des Seeding-Prozesses.
 * Wird standardmäßig nur im Entwicklungsmodus aktiviert.
 */
@Module({
  imports: [PrismaModule, EinsatzModule, CommonModule, ConfigModule],
  providers: [DatabaseCheckService, SeedService, DevSeedService, ProfileService, SeedImportService],
  exports: [SeedService, DevSeedService, ProfileService, SeedImportService],
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
        ...(SeedModule.shouldRegisterDevSeed(options) ? [DevSeedService] : []),
      ],
      exports: [SeedService, DevSeedService, ProfileService, SeedImportService],
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
        {
          provide: DevSeedService,
          inject: [SeedService, ConfigService, 'SEED_OPTIONS'],
          useFactory: (
            seedService: SeedService,
            configService: ConfigService,
            options: SeedModuleOptions,
          ) => {
            if (SeedModule.shouldRegisterDevSeed(options)) {
              return new DevSeedService(seedService, configService);
            }
            return null;
          },
        },
      ],
      exports: [SeedService, DevSeedService, ProfileService, SeedImportService],
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
