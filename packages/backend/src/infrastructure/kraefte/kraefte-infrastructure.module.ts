import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import { PrismaQualifikationRepository } from './repositories/prisma-qualifikation.repository';

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
  ],
  exports: [KRAEFTE_REPOSITORIES.QUALIFIKATION],
})
export class KraefteInfrastructureModule {}
