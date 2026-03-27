import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaEinsatzBeitrittsanfrageRepository } from '@infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository';
import { EinsatzBeitrittApplicationModule } from '@/application/einsatz-beitritt/einsatz-beitritt-application.module';
import { EinsatzBeitrittController } from './controllers/einsatz-beitritt.controller';

/**
 * Modul für Einsatz-Beitrittsanfragen (Issue #98).
 *
 * Ermöglicht Einsatzkräften das Stellen von Beitrittsanfragen
 * und Führungskräften deren Genehmigung/Ablehnung.
 */
@Module({
  imports: [PrismaModule, InfrastructureCommonModule, OutboxModule, EinsatzBeitrittApplicationModule],
  controllers: [EinsatzBeitrittController],
  providers: [
    {
      provide: EINSATZ_BEITRITTSANFRAGE_REPOSITORY,
      useClass: PrismaEinsatzBeitrittsanfrageRepository,
    },
  ],
  exports: [EINSATZ_BEITRITTSANFRAGE_REPOSITORY],
})
export class EinsatzBeitrittModule {}
