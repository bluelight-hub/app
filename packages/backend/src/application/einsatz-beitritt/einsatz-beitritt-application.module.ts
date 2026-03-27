import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { CreateBeitrittsanfrageHandler } from './commands/create-beitrittsanfrage/create-beitrittsanfrage.handler';
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
    CreateBeitrittsanfrageHandler,
    ResolveBeitrittsanfrageHandler,
    GetBeitrittsanfragenHandler,
  ],
  exports: [CreateBeitrittsanfrageHandler, ResolveBeitrittsanfrageHandler, GetBeitrittsanfragenHandler],
})
export class EinsatzBeitrittApplicationModule {}
