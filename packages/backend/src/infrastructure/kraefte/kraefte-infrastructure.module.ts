import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { PrismaQualifikationRepository } from './repositories/prisma-qualifikation.repository';
import { PrismaFahrzeugtypRepository } from './repositories/prisma-fahrzeugtyp.repository';
import { PrismaRollenDefinitionRepository } from './repositories/prisma-rollen-definition.repository';
import { PrismaFunkStatusConfigRepository } from './repositories/prisma-funk-status-config.repository';
import { PrismaStammFahrzeugRepository } from './repositories/prisma-stamm-fahrzeug.repository';
import { PrismaStammPersonRepository } from './repositories/prisma-stamm-person.repository';

/**
 * Infrastructure Module für Kräftemanagement.
 *
 * Stellt Repository Implementierungen für DI bereit.
 */
@Module({
  imports: [PrismaModule],
  providers: [
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
  ],
  exports: [
    // DI Tokens für Interface-basierte Injection
    KRAEFTE_REPOSITORIES.QUALIFIKATION,
    KRAEFTE_REPOSITORIES.FAHRZEUGTYP,
    KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION,
    KRAEFTE_REPOSITORIES.FUNK_STATUS_CONFIG,
    KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG,
    KRAEFTE_REPOSITORIES.STAMM_PERSON,
    // Konkrete Repository-Klassen für direkte Imports in Tests
    PrismaQualifikationRepository,
    PrismaFahrzeugtypRepository,
    PrismaRollenDefinitionRepository,
    PrismaFunkStatusConfigRepository,
    PrismaStammFahrzeugRepository,
    PrismaStammPersonRepository,
  ],
})
export class KraefteInfrastructureModule {}
