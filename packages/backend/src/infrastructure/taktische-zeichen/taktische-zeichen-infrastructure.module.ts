import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { LOGGER, TAKTISCHE_ZEICHEN_REPOSITORY, ZEICHEN_KATALOG_REPOSITORY, DEFAULT_ZEICHEN_REPOSITORY } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrismaTaktischesZeichenRepository } from './repositories/prisma-taktisches-zeichen.repository';
import { PrismaZeichenKatalogRepository } from './repositories/prisma-zeichen-katalog.repository';
import { PrismaDefaultZeichenRepository } from './repositories/prisma-default-zeichen.repository';
import { ZeichenKatalogSeederService } from './zeichen-katalog-seeder.service';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('TaktischeZeichenInfrastructure'),
    },
    {
      provide: TAKTISCHE_ZEICHEN_REPOSITORY,
      useClass: PrismaTaktischesZeichenRepository,
    },
    {
      provide: ZEICHEN_KATALOG_REPOSITORY,
      useClass: PrismaZeichenKatalogRepository,
    },
    {
      provide: DEFAULT_ZEICHEN_REPOSITORY,
      useClass: PrismaDefaultZeichenRepository,
    },
    ZeichenKatalogSeederService,
  ],
  exports: [TAKTISCHE_ZEICHEN_REPOSITORY, ZEICHEN_KATALOG_REPOSITORY, DEFAULT_ZEICHEN_REPOSITORY],
})
export class TaktischeZeichenInfrastructureModule {}
