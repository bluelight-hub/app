import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { FuehrungsrhythmusTemplateController } from './controllers/fuehrungsrhythmus-template.controller';
import { EinsatzFuehrungsrhythmusTemplateController } from './controllers/einsatz-fuehrungsrhythmus-template.controller';
import { PrismaFuehrungsrhythmusTemplateRepository } from '@/infrastructure/repositories/prisma-fuehrungsrhythmus-template.repository';
import { CreateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/create-fuehrungsrhythmus-template/create-fuehrungsrhythmus-template.handler';
import { GetAllFuehrungsrhythmusTemplatesHandler } from '@/application/fuehrungsrhythmus-template/queries/get-all-fuehrungsrhythmus-templates/get-all-fuehrungsrhythmus-templates.handler';
import { ActivateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/activate-fuehrungsrhythmus-template/activate-fuehrungsrhythmus-template.handler';
import { UpdateFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/update-fuehrungsrhythmus-template/update-fuehrungsrhythmus-template.handler';
import { DeleteFuehrungsrhythmusTemplateHandler } from '@/application/fuehrungsrhythmus-template/commands/delete-fuehrungsrhythmus-template/delete-fuehrungsrhythmus-template.handler';
import { FuehrungsrhythmusTemplateResponseFactory } from '@/application/fuehrungsrhythmus-template/dto/fuehrungsrhythmus-template-response.factory';
import { FUEHRUNGSRHYTHMUS_TEMPLATE_REPOSITORY } from '@infrastructure/di-tokens';
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
