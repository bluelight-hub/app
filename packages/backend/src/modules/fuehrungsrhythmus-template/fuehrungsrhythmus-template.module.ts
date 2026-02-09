import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { FuehrungsrhythmusTemplateController } from './controllers/fuehrungsrhythmus-template.controller';
// biome-ignore lint/style/useImportType: Controller class needs runtime symbol for NestJS DI
import { EinsatzFuehrungsrhythmusTemplateController } from './controllers/einsatz-fuehrungsrhythmus-template.controller';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaFuehrungsrhythmusTemplateRepository } from '@/infrastructure/repositories/prisma-fuehrungsrhythmus-template.repository';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { CreateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { GetAllFuehrungsrhythmusTemplatesHandler } from '@/application/fuehrungsrhythmus-template/queries/get-all-fuehrungsrhythmus-templates/get-all-fuehrungsrhythmus-templates.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { ActivateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/activate-fuehrungsrhythmus-template/activate-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { UpdateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/update-fuehrungsrhythmus-template/update-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { DeleteFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/delete-fuehrungsrhythmus-template/delete-fuehrungsrhythmus-template.handler';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { FuehrungsrhythmusTemplateResponseFactory } from '@/application/fuehrungsrhythmus-template/dto/fuehrungsrhythmus-template-response.factory';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: Module class needs runtime symbol for NestJS DI
import { ErinnerungModule } from '@/modules/erinnerung/erinnerung.module';

/**
 * Modul fuer Fuehrungsrhythmus-Templates (Story 6.6 + 6.7).
 * Eigenes Modul - NICHT in ErinnerungModule oder ErinnerungsvorlageModule einhaengen!
 * Importiert ErinnerungModule fuer ERINNERUNG_REPOSITORY und ErinnerungResponseFactory (Story 6.7).
 */
@Module({
  imports: [PrismaModule, OutboxModule, ErinnerungModule],
  controllers: [FuehrungsrhythmusTemplateController, EinsatzFuehrungsrhythmusTemplateController],
  providers: [
    {
      provide: FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY,
      useClass: PrismaFuehrungsrhythmusTemplateRepository,
    },
    CreateFuehrungsrhythmusTemplateHandler,
    GetAllFuehrungsrhythmusTemplatesHandler,
    ActivateFuehrungsrhythmusTemplateHandler,
    UpdateFuehrungsrhythmusTemplateHandler,
    DeleteFuehrungsrhythmusTemplateHandler,
    FuehrungsrhythmusTemplateResponseFactory,
  ],
  exports: [FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY, CreateFuehrungsrhythmusTemplateHandler, GetAllFuehrungsrhythmusTemplatesHandler],
})
export class FuehrungsrhythmusTemplateModule {}
