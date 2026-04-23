import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaGefaehrdungsbeurteilungRepository } from './repositories/prisma-gefaehrdungsbeurteilung.repository';
import { PrismaGefaehrdungsbeurteilungVersionRepository } from './repositories/prisma-gefaehrdungsbeurteilung-version.repository';
import { PrismaGefaehrdungsbeurteilungVorlageRepository } from './repositories/prisma-gefaehrdungsbeurteilung-vorlage.repository';
import { EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-erstellt.adapter';
import { EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter } from './event-adapters/gefaehrdungsbeurteilung-aktualisiert.adapter';

/**
 * Infrastructure-Modul des Eigenschutz-Feature-Slice (Story 2.1+).
 *
 * Stellt die Prisma-Repositories für das Gefährdungsbeurteilungs-Modell bereit
 * und registriert den Log-Adapter für `eigenschutz.gefaehrdungsbeurteilung_-
 * erstellt`. Das Modul wird von `EigenschutzModule` importiert; eine Direkt-
 * Registrierung in `AppModule` ist nicht nötig.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EigenschutzInfrastructure'),
    },
    { provide: GEFAEHRDUNGSBEURTEILUNG_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungRepository },
    { provide: GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungVersionRepository },
    { provide: GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY, useClass: PrismaGefaehrdungsbeurteilungVorlageRepository },
    EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
    EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter,
  ],
  exports: [
    GEFAEHRDUNGSBEURTEILUNG_REPOSITORY,
    GEFAEHRDUNGSBEURTEILUNG_VERSION_REPOSITORY,
    GEFAEHRDUNGSBEURTEILUNG_VORLAGE_REPOSITORY,
    EigenschutzGefaehrdungsbeurteilungErstelltEventAdapter,
    EigenschutzGefaehrdungsbeurteilungAktualisiertEventAdapter,
  ],
})
export class EigenschutzInfrastructureModule {}
