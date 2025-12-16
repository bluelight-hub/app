import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { PrismaQualifikationRepository } from './repositories/prisma-qualifikation.repository';
import { PrismaFahrzeugtypRepository } from './repositories/prisma-fahrzeugtyp.repository';
import { PrismaRollenDefinitionRepository } from './repositories/prisma-rollen-definition.repository';

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
  ],
  exports: [KRAEFTE_REPOSITORIES.QUALIFIKATION, KRAEFTE_REPOSITORIES.FAHRZEUGTYP, KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION],
})
export class KraefteInfrastructureModule {}
