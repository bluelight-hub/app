import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { EINSATZ_BEITRITTSANFRAGE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaEinsatzBeitrittsanfrageRepository } from '@infrastructure/database/repositories/prisma-einsatz-beitrittsanfrage.repository';
import { CreateBeitrittsanfrageHandler } from './commands/create-beitrittsanfrage/create-beitrittsanfrage.handler';
import { InviteExterneHandler } from './commands/invite-externe/invite-externe.handler';
import { ResolveBeitrittsanfrageHandler } from './commands/resolve-beitrittsanfrage/resolve-beitrittsanfrage.handler';
import { GetBeitrittsanfragenHandler } from './queries/get-beitrittsanfragen/get-beitrittsanfragen.handler';

/**
 * NestJS-Modul für Application Layer - Einsatz-Beitritt Bounded Context.
 *
 * Registriert alle Command- und Query-Handler für Beitrittsanfragen.
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzBeitritt'),
    },
    {
      provide: EINSATZ_BEITRITTSANFRAGE_REPOSITORY,
      useClass: PrismaEinsatzBeitrittsanfrageRepository,
    },
    CreateBeitrittsanfrageHandler,
    InviteExterneHandler,
    ResolveBeitrittsanfrageHandler,
    GetBeitrittsanfragenHandler,
  ],
  exports: [CreateBeitrittsanfrageHandler, InviteExterneHandler, ResolveBeitrittsanfrageHandler, GetBeitrittsanfragenHandler, EINSATZ_BEITRITTSANFRAGE_REPOSITORY],
})
export class EinsatzBeitrittApplicationModule {}
