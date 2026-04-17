import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { GEFAHRENMATRIX_REPOSITORY, GEFAHRENZONE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaGefahrenmatrixRepository } from '@/infrastructure/database/repositories/prisma-gefahrenmatrix.repository';
import { PrismaGefahrenzoneRepository } from '@/infrastructure/database/repositories/prisma-gefahrenzone.repository';
import { GetGefahrenmatrixHandler } from './queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixHandler } from './commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';
import { CreateGefahrenzoneHandler } from './commands/create-gefahrenzone/create-gefahrenzone.handler';
import { UpdateGefahrenzoneGeometryHandler } from './commands/update-gefahrenzone-geometry/update-gefahrenzone-geometry.handler';
import { DeleteGefahrenzoneHandler } from './commands/delete-gefahrenzone/delete-gefahrenzone.handler';
import { GetGefahrenzonenByEinsatzHandler } from './queries/get-gefahrenzonen-by-einsatz/get-gefahrenzonen-by-einsatz.handler';

/**
 * NestJS-Modul für Application Layer — Gefahr Bounded Context.
 *
 * Registriert alle Command- und Query-Handler für Gefahrenmatrix und Gefahrenzonen (Issue #627).
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Gefahr'),
    },
    {
      provide: GEFAHRENMATRIX_REPOSITORY,
      useClass: PrismaGefahrenmatrixRepository,
    },
    {
      provide: GEFAHRENZONE_REPOSITORY,
      useClass: PrismaGefahrenzoneRepository,
    },
    GetGefahrenmatrixHandler,
    UpdateGefahrenmatrixHandler,
    CreateGefahrenzoneHandler,
    UpdateGefahrenzoneGeometryHandler,
    DeleteGefahrenzoneHandler,
    GetGefahrenzonenByEinsatzHandler,
  ],
  exports: [
    GetGefahrenmatrixHandler,
    UpdateGefahrenmatrixHandler,
    CreateGefahrenzoneHandler,
    UpdateGefahrenzoneGeometryHandler,
    DeleteGefahrenzoneHandler,
    GetGefahrenzonenByEinsatzHandler,
    GEFAHRENMATRIX_REPOSITORY,
    GEFAHRENZONE_REPOSITORY,
  ],
})
export class GefahrApplicationModule {}
