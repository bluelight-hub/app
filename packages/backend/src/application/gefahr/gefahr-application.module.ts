import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { GEFAHRENMATRIX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaGefahrenmatrixRepository } from '@/infrastructure/database/repositories/prisma-gefahrenmatrix.repository';
import { GetGefahrenmatrixHandler } from './queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixHandler } from './commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';

/**
 * NestJS-Modul für Application Layer — Gefahr Bounded Context.
 *
 * Registriert alle Command- und Query-Handler für die Gefahrenmatrix.
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [
    // Logger
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Gefahr'),
    },
    // Repository
    {
      provide: GEFAHRENMATRIX_REPOSITORY,
      useClass: PrismaGefahrenmatrixRepository,
    },
    // Query Handler
    GetGefahrenmatrixHandler,
    // Command Handler
    UpdateGefahrenmatrixHandler,
  ],
  exports: [GetGefahrenmatrixHandler, UpdateGefahrenmatrixHandler, GEFAHRENMATRIX_REPOSITORY],
})
export class GefahrApplicationModule {}
