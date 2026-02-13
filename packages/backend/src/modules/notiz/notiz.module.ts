import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { KategorieModule } from '@/modules/kategorie/kategorie.module';
import { NotizController } from './controllers/notiz.controller';
import { PrismaNotizRepository } from '@/infrastructure/repositories/prisma-notiz.repository';
import { CreateNotizHandler } from '@/application/notiz/commands/create-notiz/create-notiz.handler';
import { UpdateNotizHandler } from '@/application/notiz/commands/update-notiz/update-notiz.handler';
import { DeleteNotizHandler } from '@/application/notiz/commands/delete-notiz/delete-notiz.handler';
import { GetNotizenByEinsatzHandler } from '@/application/notiz/queries/get-notizen-by-einsatz/get-notizen-by-einsatz.handler';
import { NotizResponseFactory } from '@/application/notiz/dto/notiz-response.factory';
import { NOTIZ_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Modul fuer Notizen im Einsatz-Kontext (Story 7.1 + 7.3).
 * Eigenes Modul - NICHT in ErinnerungModule einhaengen!
 */
@Module({
  // Story 8.2: KategorieModule für Kategorie-Daten in Query-Responses
  imports: [PrismaModule, OutboxModule, UserInfrastructureModule, forwardRef(() => KategorieModule)],
  controllers: [NotizController],
  providers: [
    {
      provide: NOTIZ_REPOSITORY,
      useClass: PrismaNotizRepository,
    },
    CreateNotizHandler,
    UpdateNotizHandler,
    DeleteNotizHandler,
    GetNotizenByEinsatzHandler,
    NotizResponseFactory,
  ],
  exports: [NOTIZ_REPOSITORY, CreateNotizHandler, UpdateNotizHandler, DeleteNotizHandler, GetNotizenByEinsatzHandler],
})
export class NotizModule {}
