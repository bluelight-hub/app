import { Module } from '@nestjs/common';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { AlarmierungInfrastructureModule } from '@infrastructure/alarmierung/alarmierung-infrastructure.module';
import { EtbInfrastructureModule } from '@infrastructure/etb/etb-infrastructure.module';
import { EventInfrastructureModule } from '@infrastructure/events/event-infrastructure.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { OutboxModule } from '@infrastructure/outbox';
import { EtbApplicationModule } from '@application/etb/etb-application.module';
import { EntferneEmpfaengerHandler } from './commands/entferne-empfaenger';
import { ErstelleAlarmierungHandler } from './commands/erstelle-alarmierung';
import { ErstelleNachalarmierungHandler } from './commands/erstelle-nachalarmierung';
import { FuegeEmpfaengerHinzuHandler } from './commands/fuege-empfaenger-hinzu';
import { KorrigiereZeitpunktHandler } from './commands/korrigiere-zeitpunkt';
import { SchliesseAlarmierungAbHandler } from './commands/schliesse-alarmierung-ab';
import {
  AlarmierungAbgeschlossenZuEtbHandler,
  AlarmierungEmpfaengerHinzugefuegtZuEtbHandler,
  AlarmierungErstelltZuEtbHandler,
  AlarmierungZeitpunktKorrigiertZuEtbHandler,
  FmsStatusZuAlarmierungHandler,
} from './event-handlers';
import { GetAlarmierungByIdQueryHandler } from './queries/get-alarmierung-by-id';
import { GetAlarmierungTimelineQueryHandler } from './queries/get-alarmierung-timeline';
import { ListAlarmierungenQueryHandler } from './queries/list-alarmierungen';

/**
 * Application-Modul für den Alarmierung Bounded Context (Issue #408).
 *
 * Registriert alle Alarmierungs-Command-/Query-Handler und die zugehörigen
 * Event-Handler:
 * - {@link FmsStatusZuAlarmierungHandler} — Auto-Population der Empfänger-
 *   Zeitpunkte aus FMS-Statuswechseln.
 * - {@link AlarmierungErstelltZuEtbHandler} u.a. — schreiben strukturierte
 *   ETB-Einträge der Kategorie `ALARMIERUNG`.
 *
 * **Dependencies (Bind-Punkte):**
 * - `ALARMIERUNG_REPOSITORY` (Infrastructure, T4 — `AlarmierungInfrastructureModule`)
 * - `KRAEFTE_REPOSITORIES.*` für Name-Snapshots beim Auslösen / Hinzufügen
 *   von Empfängern.
 * - `ETB_REPOSITORY` für die Timeline-Query (über `EtbApplicationModule` →
 *   `EtbInfrastructureModule`).
 * - `AddEintragHandler` aus `EtbApplicationModule` für ETB-Schreibpfade.
 *
 * Die konkrete Bindung des `ALARMIERUNG_REPOSITORY` erfolgt im
 * `AlarmierungInfrastructureModule` (T4) — dieses Modul wird vom HTTP-Modul
 * (`AlarmierungModule`, T5) zusammen mit dem AlarmierungApplicationModule
 * importiert.
 */
@Module({
  imports: [AlarmierungInfrastructureModule, EventInfrastructureModule, KraefteInfrastructureModule, OutboxModule, EtbInfrastructureModule, EtbApplicationModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Alarmierung'),
    },

    // Command Handlers
    ErstelleAlarmierungHandler,
    ErstelleNachalarmierungHandler,
    FuegeEmpfaengerHinzuHandler,
    EntferneEmpfaengerHandler,
    KorrigiereZeitpunktHandler,
    SchliesseAlarmierungAbHandler,

    // Query Handlers
    GetAlarmierungByIdQueryHandler,
    ListAlarmierungenQueryHandler,
    GetAlarmierungTimelineQueryHandler,

    // Event Handlers (registered via symbol token for adapter wiring in T4/T5)
    {
      provide: EVENT_HANDLER.FMS_STATUS_ZU_ALARMIERUNG,
      useClass: FmsStatusZuAlarmierungHandler,
    },
    {
      provide: EVENT_HANDLER.ALARMIERUNG_ERSTELLT_ZU_ETB,
      useClass: AlarmierungErstelltZuEtbHandler,
    },
    {
      provide: EVENT_HANDLER.ALARMIERUNG_EMPFAENGER_HINZUGEFUEGT_ZU_ETB,
      useClass: AlarmierungEmpfaengerHinzugefuegtZuEtbHandler,
    },
    {
      provide: EVENT_HANDLER.ALARMIERUNG_ZEITPUNKT_KORRIGIERT_ZU_ETB,
      useClass: AlarmierungZeitpunktKorrigiertZuEtbHandler,
    },
    {
      provide: EVENT_HANDLER.ALARMIERUNG_ABGESCHLOSSEN_ZU_ETB,
      useClass: AlarmierungAbgeschlossenZuEtbHandler,
    },
  ],
  exports: [
    // Command Handlers
    ErstelleAlarmierungHandler,
    ErstelleNachalarmierungHandler,
    FuegeEmpfaengerHinzuHandler,
    EntferneEmpfaengerHandler,
    KorrigiereZeitpunktHandler,
    SchliesseAlarmierungAbHandler,

    // Query Handlers
    GetAlarmierungByIdQueryHandler,
    ListAlarmierungenQueryHandler,
    GetAlarmierungTimelineQueryHandler,

    // Event Handler Tokens
    EVENT_HANDLER.FMS_STATUS_ZU_ALARMIERUNG,
    EVENT_HANDLER.ALARMIERUNG_ERSTELLT_ZU_ETB,
    EVENT_HANDLER.ALARMIERUNG_EMPFAENGER_HINZUGEFUEGT_ZU_ETB,
    EVENT_HANDLER.ALARMIERUNG_ZEITPUNKT_KORRIGIERT_ZU_ETB,
    EVENT_HANDLER.ALARMIERUNG_ABGESCHLOSSEN_ZU_ETB,
  ],
})
export class AlarmierungApplicationModule {}
