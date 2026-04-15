import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { GefahrApplicationModule } from '@/application/gefahr/gefahr-application.module';
import { HAZARD_ZONE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaHazardZoneRepository } from '@/infrastructure/database/repositories/prisma-hazard-zone.repository';
import { CreateHazardZoneHandler } from './commands/create-hazard-zone/create-hazard-zone.handler';
import { UpdateHazardZoneHandler } from './commands/update-hazard-zone/update-hazard-zone.handler';
import { DeleteHazardZoneHandler } from './commands/delete-hazard-zone/delete-hazard-zone.handler';
import { ListHazardZonesHandler } from './queries/list-hazard-zones/list-hazard-zones.handler';

/**
 * NestJS-Modul für Application Layer — HazardZone Bounded Context (Issue #627).
 *
 * Registriert alle Command- und Query-Handler für die räumliche
 * Gefahrendarstellung (Polygone/Kreise) auf der Lagekarte.
 */
@Module({
  imports: [PrismaModule, OutboxModule, GefahrApplicationModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('HazardZone'),
    },
    {
      provide: HAZARD_ZONE_REPOSITORY,
      useClass: PrismaHazardZoneRepository,
    },
    CreateHazardZoneHandler,
    UpdateHazardZoneHandler,
    DeleteHazardZoneHandler,
    ListHazardZonesHandler,
  ],
  exports: [CreateHazardZoneHandler, UpdateHazardZoneHandler, DeleteHazardZoneHandler, ListHazardZonesHandler, HAZARD_ZONE_REPOSITORY],
})
export class HazardZoneApplicationModule {}
