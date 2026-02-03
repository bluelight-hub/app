import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { FuehrungsrhythmusTemplateController } from './controllers/fuehrungsrhythmus-template.controller';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaFuehrungsrhythmusTemplateRepository } from '@/infrastructure/repositories/prisma-fuehrungsrhythmus-template.repository';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { CreateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { GetAllFuehrungsrhythmusTemplatesHandler } from '@/application/fuehrungsrhythmus-template/queries/get-all-fuehrungsrhythmus-templates/get-all-fuehrungsrhythmus-templates.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { FuehrungsrhythmusTemplateResponseFactory } from '@/application/fuehrungsrhythmus-template/dto/fuehrungsrhythmus-template-response.factory';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@infrastructure/di-tokens';

/**
 * Modul fuer Fuehrungsrhythmus-Templates (Story 6.6).
 * Eigenes Modul - NICHT in ErinnerungModule oder ErinnerungsvorlageModule einhaengen!
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [FuehrungsrhythmusTemplateController],
  providers: [
    {
      provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY,
      useClass: PrismaFuehrungsrhythmusTemplateRepository,
    },
    CreateFuehrungsrhythmusTemplateHandler,
    GetAllFuehrungsrhythmusTemplatesHandler,
    FuehrungsrhythmusTemplateResponseFactory,
  ],
  exports: [FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, CreateFuehrungsrhythmusTemplateHandler, GetAllFuehrungsrhythmusTemplatesHandler],
})
export class FuehrungsrhythmusTemplateModule {}
