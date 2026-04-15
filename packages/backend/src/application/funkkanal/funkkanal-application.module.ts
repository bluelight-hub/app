import { Module } from '@nestjs/common';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { EtbInfrastructureModule } from '@infrastructure/etb/etb-infrastructure.module';
import { EventInfrastructureModule } from '@infrastructure/events/event-infrastructure.module';
import { FunkkanalInfrastructureModule } from '@infrastructure/funkkanal/funkkanal-infrastructure.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { ActivateFunkkanalHandler } from './commands/activate-funkkanal';
import { AendereZuordnungRolleHandler } from './commands/aendere-zuordnung-rolle';
import { ArchiveFunkkanalHandler } from './commands/archive-funkkanal';
import { ChangeFunkkanalDetailsHandler } from './commands/change-funkkanal-details';
import { CreateFunkkanalHandler } from './commands/create-funkkanal';
import { DeactivateFunkkanalHandler } from './commands/deactivate-funkkanal';
import { EntferneZuordnungHandler } from './commands/entferne-zuordnung';
import { RenameFunkkanalHandler } from './commands/rename-funkkanal';
import { ReorderFunkkanaeleHandler } from './commands/reorder-funkkanaele';
import { SetFunkkanalSortIndexHandler } from './commands/set-funkkanal-sort-index';
import { SetFunkkanalZweckHandler } from './commands/set-funkkanal-zweck';
import { ZuordneKraftZuKanalHandler } from './commands/zuordne-kraft-zu-kanal';
import { NotfallFunkspruchAlertHandler } from './event-handlers';
import { GetFunkkanalByIdQueryHandler } from './queries/get-funkkanal-by-id';
import { GetKanalplanQueryHandler } from './queries/get-kanalplan';
import { GetRufnamenVorschlaegeQueryHandler } from './queries/get-rufnamen-vorschlaege';

/**
 * Application-Modul für den Funkkanal Bounded Context (Issue #407).
 *
 * Registriert alle Funkkanal-Command-/Query-Handler und den
 * {@link NotfallFunkspruchAlertHandler}. Wird vom HTTP-Modul
 * (`FunkkanalModule` unter `modules/funkkanal/`) importiert und stellt die
 * Handler dem Controller per DI bereit.
 *
 * Dependencies:
 * - `FUNKKANAL_REPOSITORY` (Infrastructure)
 * - `KRAEFTE_REPOSITORIES.*` für Rufname-Snapshots (Zuordnungs-Handler)
 * - `ETB_REPOSITORY` für den `einsatzId`-Lookup im Notfall-Handler
 * - `EVENT_PUBLISHER` für das Publizieren von `NotfallAlertRequestedEvent`
 */
@Module({
  imports: [EventInfrastructureModule, EtbInfrastructureModule, FunkkanalInfrastructureModule, KraefteInfrastructureModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Funkkanal'),
    },

    // Command Handlers (Funkkanal Lifecycle)
    CreateFunkkanalHandler,
    RenameFunkkanalHandler,
    ChangeFunkkanalDetailsHandler,
    SetFunkkanalZweckHandler,
    SetFunkkanalSortIndexHandler,
    ActivateFunkkanalHandler,
    DeactivateFunkkanalHandler,
    ArchiveFunkkanalHandler,
    ReorderFunkkanaeleHandler,

    // Command Handlers (Zuordnungen)
    ZuordneKraftZuKanalHandler,
    AendereZuordnungRolleHandler,
    EntferneZuordnungHandler,

    // Query Handlers
    GetKanalplanQueryHandler,
    GetFunkkanalByIdQueryHandler,
    GetRufnamenVorschlaegeQueryHandler,

    // Event Handlers (registered via symbol token for adapter wiring)
    {
      provide: EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT,
      useClass: NotfallFunkspruchAlertHandler,
    },
  ],
  exports: [
    EVENT_HANDLER.NOTFALL_FUNKSPRUCH_ALERT,

    // Command Handlers
    CreateFunkkanalHandler,
    RenameFunkkanalHandler,
    ChangeFunkkanalDetailsHandler,
    SetFunkkanalZweckHandler,
    SetFunkkanalSortIndexHandler,
    ActivateFunkkanalHandler,
    DeactivateFunkkanalHandler,
    ArchiveFunkkanalHandler,
    ReorderFunkkanaeleHandler,
    ZuordneKraftZuKanalHandler,
    AendereZuordnungRolleHandler,
    EntferneZuordnungHandler,

    // Query Handlers
    GetKanalplanQueryHandler,
    GetFunkkanalByIdQueryHandler,
    GetRufnamenVorschlaegeQueryHandler,
  ],
})
export class FunkkanalApplicationModule {}
