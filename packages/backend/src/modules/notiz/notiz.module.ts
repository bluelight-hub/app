import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
// biome-ignore lint/style/useImportType: NestJS Module needs runtime symbol
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
// biome-ignore lint/style/useImportType: NestJS Module needs runtime symbol
import { KategorieModule } from '@/modules/kategorie/kategorie.module';
import { NotizController } from './controllers/notiz.controller';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaNotizRepository } from '@/infrastructure/repositories/prisma-notiz.repository';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { CreateNotizHandler } from '@/application/notiz/commands/create-notiz/create-notiz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { UpdateNotizHandler } from '@/application/notiz/commands/update-notiz/update-notiz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { DeleteNotizHandler } from '@/application/notiz/commands/delete-notiz/delete-notiz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { GetNotizenByEinsatzHandler } from '@/application/notiz/queries/get-notizen-by-einsatz/get-notizen-by-einsatz.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
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
