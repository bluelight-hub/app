import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EigenschutzInfrastructureModule } from '@/infrastructure/eigenschutz/eigenschutz-infrastructure.module';
import { EigenschutzApplicationModule } from '@application/eigenschutz/eigenschutz-application.module';
import { RepromptPsaQuittungScheduler } from './reprompt-psa-quittung.scheduler';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

/**
 * Modul für den Eigenschutz-Scheduler-Stack (Story 3.7 AC11).
 *
 * **Wichtig:** Wird genau einmal in `app.module.ts` registriert, um
 * mehrfache Cron-Job-Registrierung zu vermeiden (Lesson aus
 * `SchedulerModule`).
 *
 * Imports:
 * - `EigenschutzInfrastructureModule` — Liefert
 *   `IPsaPropagationOverdueQueryPort` (Story 3.7 AC2).
 * - `EigenschutzApplicationModule` — Liefert
 *   `EmitPsaQuittungUeberfaelligHandler` (Story 3.7 AC4).
 * - `CqrsModule` — Liefert `CommandBus` für den Scheduler.
 *
 * **LOGGER-Provider:** Lokal mit Context `'EigenschutzScheduler'` —
 * konsistent mit dem Per-Modul-Pattern im Projekt (vgl.
 * `EigenschutzInfrastructureModule`, `AppModule`); jedes Modul setzt
 * seinen eigenen Logger-Context für Log-Routing.
 */
@Module({
  imports: [CqrsModule, EigenschutzInfrastructureModule, EigenschutzApplicationModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EigenschutzScheduler'),
    },
    RepromptPsaQuittungScheduler,
  ],
})
export class EigenschutzSchedulerModule {}
