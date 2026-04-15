import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { EinsatzTeilnehmerModule } from '@/modules/einsatz-teilnehmer/einsatz-teilnehmer.module';
import { EtbInfrastructureModule } from '@infrastructure/etb/etb-infrastructure.module';
import { EINSATZ_EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

import { EinsatzEventsGateway } from './einsatz-events.gateway';
import { EinsatzEventPublisher } from './einsatz-event.publisher';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';

/**
 * Infrastructure-Modul für den einsatzgebundenen WebSocket-Broadcast
 * (Issue #407, Task 18).
 *
 * Registriert:
 * - {@link EinsatzEventsGateway} (Namespace `/ws/einsatz-events`)
 * - {@link EinsatzEventPublisher} unter `EINSATZ_EVENT_PUBLISHER`
 * - {@link WsJwtAuthGuard}
 *
 * Damit werden alle bisher als `@Optional()` injizierten Publisher-Slots
 * (`FunkkanalEventAdapter`, `EtbFunkspruchBroadcastAdapter`) endlich besetzt.
 */
@Module({
  imports: [
    InfrastructureCommonModule,
    EinsatzTeilnehmerModule,
    EtbInfrastructureModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        secret: appConfig.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('WebsocketModule'),
    },
    EinsatzEventsGateway,
    WsJwtAuthGuard,
    {
      provide: EINSATZ_EVENT_PUBLISHER,
      useClass: EinsatzEventPublisher,
    },
  ],
  exports: [EINSATZ_EVENT_PUBLISHER, EinsatzEventsGateway],
})
export class WebsocketModule {}
