import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { KategorieController } from './controllers/kategorie.controller';
import { PrismaKategorieRepository } from '@/infrastructure/repositories/prisma-kategorie.repository';
import { CreateKategorieHandler } from '@/application/kategorie/commands/create-kategorie/create-kategorie.handler';
import { DeleteKategorieHandler } from '@/application/kategorie/commands/delete-kategorie/delete-kategorie.handler';
import { GetKategorienByEinsatzHandler } from '@/application/kategorie/queries/get-kategorien-by-einsatz/get-kategorien-by-einsatz.handler';
import { KategorieResponseFactory } from '@/application/kategorie/dto/kategorie-response.factory';
import { KATEGORIE_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Modul fuer Kategorien im Einsatz-Kontext (Story 8.1).
 * Eigenes Modul - NICHT in NotizModule einhaengen!
 */
@Module({
  imports: [PrismaModule, OutboxModule, UserInfrastructureModule],
  controllers: [KategorieController],
  providers: [
    {
      provide: KATEGORIE_REPOSITORY,
      useClass: PrismaKategorieRepository,
    },
    CreateKategorieHandler,
    DeleteKategorieHandler,
    GetKategorienByEinsatzHandler,
    KategorieResponseFactory,
  ],
  exports: [KATEGORIE_REPOSITORY],
})
export class KategorieModule {}
