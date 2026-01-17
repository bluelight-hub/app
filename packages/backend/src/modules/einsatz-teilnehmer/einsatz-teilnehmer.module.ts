import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { EINSATZ_TEILNEHMER_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaEinsatzTeilnehmerRepository } from '@infrastructure/einsatz-teilnehmer/repositories/prisma-einsatz-teilnehmer.repository';
import { JoinEinsatzHandler } from '@/application/einsatz-teilnehmer/commands/join-einsatz/join-einsatz.handler';
import { GetMyTeilnahmeHandler } from '@/application/einsatz-teilnehmer/queries/get-my-teilnahme/get-my-teilnahme.handler';
import { GetAllTeilnehmerHandler } from '@/application/einsatz-teilnehmer/queries/get-all-teilnehmer/get-all-teilnehmer.handler';
import { EinsatzTeilnehmerController } from './controllers/einsatz-teilnehmer.controller';

/**
 * Module für Einsatz-Teilnehmer Management.
 *
 * Ermöglicht Usern das Beitreten zu Einsätzen mit einem Funkrufnamen.
 * Der Funkrufname wird für ETB-Absender Auto-Fill verwendet.
 */
@Module({
  imports: [PrismaModule, InfrastructureCommonModule],
  controllers: [EinsatzTeilnehmerController],
  providers: [
    // Repository
    {
      provide: EINSATZ_TEILNEHMER_REPOSITORY,
      useClass: PrismaEinsatzTeilnehmerRepository,
    },
    // Handlers
    JoinEinsatzHandler,
    GetMyTeilnahmeHandler,
    GetAllTeilnehmerHandler,
  ],
  exports: [EINSATZ_TEILNEHMER_REPOSITORY, JoinEinsatzHandler, GetMyTeilnahmeHandler, GetAllTeilnehmerHandler],
})
export class EinsatzTeilnehmerModule {}
