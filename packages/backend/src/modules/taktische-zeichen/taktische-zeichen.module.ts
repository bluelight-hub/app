import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { TaktischeZeichenInfrastructureModule } from '@infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { ErstelleZeichenHandler } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler';
import { PlatziereZeichenHandler } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.handler';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { EntferneZeichenHandler } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.handler';
import { FindeZeichenFuerEinsatzHandler } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler';
import { FindeKatalogEintraegeHandler } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.handler';
import { FindeDefaultZeichenHandler } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.handler';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
import { TaktischeZeichenController } from './taktische-zeichen.controller';

@Module({
  imports: [PrismaModule, OutboxModule, TaktischeZeichenInfrastructureModule],
  controllers: [TaktischeZeichenController],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('TaktischeZeichenModule'),
    },
    ErstelleZeichenHandler,
    PlatziereZeichenHandler,
    AktualisiereZeichenHandler,
    EntferneZeichenHandler,
    FindeZeichenFuerEinsatzHandler,
    FindeKatalogEintraegeHandler,
    FindeDefaultZeichenHandler,
    TaktischesZeichenResponseFactory,
  ],
})
export class TaktischeZeichenModule {}
