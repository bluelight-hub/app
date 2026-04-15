import { Module } from '@nestjs/common';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { EtbInfrastructureModule } from '@infrastructure/etb/etb-infrastructure.module';
import { EventInfrastructureModule } from '@infrastructure/events/event-infrastructure.module';
import { FunkkanalInfrastructureModule } from '@infrastructure/funkkanal/funkkanal-infrastructure.module';
import { NotfallFunkspruchAlertHandler } from './event-handlers';

/**
 * Application-Modul für den Funkkanal Bounded Context (Issue #407).
 *
 * Registriert derzeit den {@link NotfallFunkspruchAlertHandler} unter dem
 * `EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT` Token. Command- und Query-Handler
 * werden in einem späteren Task zusammen mit den HTTP-Controllern eingebunden.
 *
 * Dependencies:
 * - `ETB_REPOSITORY` für den `einsatzId`-Lookup im Handler
 * - `EVENT_PUBLISHER` für das Publizieren von `NotfallAlertRequestedEvent`
 * - `FUNKKANAL_REPOSITORY` als Infrastructure-Abhängigkeit (re-exportiert für
 *   künftige Command-Handler-Registrierung)
 */
@Module({
  imports: [EventInfrastructureModule, EtbInfrastructureModule, FunkkanalInfrastructureModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Funkkanal'),
    },
    {
      provide: EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT,
      useClass: NotfallFunkspruchAlertHandler,
    },
  ],
  exports: [EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT],
})
export class FunkkanalApplicationModule {}
