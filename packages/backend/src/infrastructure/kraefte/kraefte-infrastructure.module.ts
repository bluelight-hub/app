import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaQualifikationRepository } from './repositories/prisma-qualifikation.repository';
import { PrismaFahrzeugtypRepository } from './repositories/prisma-fahrzeugtyp.repository';
import { PrismaRollenDefinitionRepository } from './repositories/prisma-rollen-definition.repository';
import { PrismaFunkStatusConfigRepository } from './repositories/prisma-funk-status-config.repository';
import { PrismaStammFahrzeugRepository } from './repositories/prisma-stamm-fahrzeug.repository';
import { PrismaStammPersonRepository } from './repositories/prisma-stamm-person.repository';
import { PrismaEinsatzFahrzeugRepository } from './repositories/prisma-einsatz-fahrzeug.repository';
import { PrismaEinsatzPersonRepository } from './repositories/prisma-einsatz-person.repository';
import { PrismaRollenBesetzungRepository } from './repositories/prisma-rollen-besetzung.repository';

/**
 * Infrastructure Module für Kräftemanagement.
 *
 * Stellt Repository Implementierungen für DI bereit.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    // Logger für Repositories (Data Integrity Logging)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('KraefteInfrastructure'),
    },
    {
      provide: KRAEFTE_REPOSITORIES.QUALIFIKATION,
      useClass: PrismaQualifikationRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.FAHRZEUGTYP,
      useClass: PrismaFahrzeugtypRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION,
      useClass: PrismaRollenDefinitionRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG,
      useClass: PrismaFunkStatusConfigRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG,
      useClass: PrismaStammFahrzeugRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.STAMM_PERSON,
      useClass: PrismaStammPersonRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG,
      useClass: PrismaEinsatzFahrzeugRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON,
      useClass: PrismaEinsatzPersonRepository,
    },
    {
      provide: KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG,
      useClass: PrismaRollenBesetzungRepository,
    },
  ],
  exports: [
    // DI Tokens für Interface-basierte Injection
    KRAEFTE_REPOSITORIES.QUALIFIKATION,
    KRAEFTE_REPOSITORIES.FAHRZEUGTYP,
    KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION,
    KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG,
    KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG,
    KRAEFTE_REPOSITORIES.STAMM_PERSON,
    KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG,
    KRAEFTE_REPOSITORIES.EINSATZ_PERSON,
    KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG,
  ],
})
export class KraefteInfrastructureModule {}
