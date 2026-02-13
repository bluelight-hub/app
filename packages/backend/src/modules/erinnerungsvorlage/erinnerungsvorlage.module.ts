import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { ErinnerungsvorlageController } from './controllers/erinnerungsvorlage.controller';
import { PrismaErinnerungsvorlageRepository } from '@/infrastructure/repositories/prisma-erinnerungsvorlage.repository';
import { CreateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/create-erinnerungsvorlage/create-erinnerungsvorlage.handler';
import { UpdateErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/update-erinnerungsvorlage/update-erinnerungsvorlage.handler';
import { DeleteErinnerungsvorlageHandler } from '@/application/erinnerungsvorlage/commands/delete-erinnerungsvorlage/delete-erinnerungsvorlage.handler';
import { GetAllVorlagenHandler } from '@/application/erinnerungsvorlage/queries/get-all-vorlagen/get-all-vorlagen.handler';
import { ErinnerungsvorlageResponseFactory } from '@/application/erinnerungsvorlage/dto/erinnerungsvorlage-response.factory';
import { ERINNERUNGSVORLAGE_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Modul für Erinnerungsvorlagen (Story 6.1).
 * Eigenes Modul - NICHT in ErinnerungModule einhängen!
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [ErinnerungsvorlageController],
  providers: [
    {
      provide: ERINNERUNGSVORLAGE_REPOSITORY,
      useClass: PrismaErinnerungsvorlageRepository,
    },
    CreateErinnerungsvorlageHandler,
    UpdateErinnerungsvorlageHandler,
    DeleteErinnerungsvorlageHandler,
    GetAllVorlagenHandler,
    ErinnerungsvorlageResponseFactory,
  ],
  exports: [ERINNERUNGSVORLAGE_REPOSITORY, CreateErinnerungsvorlageHandler, UpdateErinnerungsvorlageHandler, DeleteErinnerungsvorlageHandler, GetAllVorlagenHandler],
})
export class ErinnerungsvorlageModule {}
