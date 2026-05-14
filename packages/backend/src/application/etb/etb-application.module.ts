import { AddEintragHandler, AddKorrekturEintragHandler, CreateEtbHandler, DeleteEintragHandler } from '@application/etb/commands';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { EtbInfrastructureModule } from '@infrastructure/etb/etb-infrastructure.module';
import { EventInfrastructureModule } from '@infrastructure/events/event-infrastructure.module';
import { LagekarteInfrastructureModule } from '@infrastructure/lagekarte-infrastructure.module';
import { UserInfrastructureModule } from '@infrastructure/user/user-infrastructure.module';
import { Module } from '@nestjs/common';
import {
  EtbAutoCreationHandler,
  FahrzeugErfasstEventHandler,
  FmsStatusGeaendertEventHandler,
  EinsatzPersonHinzugefuegtEventHandler,
  PersonFahrzeugZuweisungHandler,
  RolleBesetztEventHandler,
  RolleFreigegebenEventHandler,
  ErinnerungAktualisiertEventHandler,
  ErinnerungGeloeschtEventHandler,
  ErinnerungAusgeloestEventHandler,
  ErinnerungAcknowledgedEventHandler,
  ErinnerungSnoozedEventHandler,
  ErinnerungRetriggeredEventHandler,
  ErinnerungErledigtEventHandler,
  ErinnerungErstelltEventHandler,
  ErinnerungAssignedEventHandler,
  ErinnerungEskaliertEventHandler,
  ErinnerungIntensiviertEventHandler,
  FuehrungsrhythmusAktiviertEtbHandler,
  NotizErstelltEtbHandler,
  NotizAktualisiertEtbHandler,
  NotizGeloeschtEtbHandler,
  BefehlErstelltEtbHandler,
  BefehlQuittiertEtbHandler,
  BefehlStatusGeaendertEtbHandler,
  BefehlZugestelltEtbHandler,
  RolleGeaendertEtbHandler,
  BefehlAnonymisiertEtbHandler,
  BefehlGeloeschtEtbHandler,
  EtbEinsatzCompletedHandler,
  GefahrenmatrixAktualisiertEtbHandler,
  GefaehrdungsbeurteilungErstelltEtbHandler,
  GefaehrdungsbeurteilungAktualisiertEtbHandler,
  SicherheitsregelAusgerufenEtbHandler,
  SicherheitsregelQuittiertEtbHandler,
  PsaProfilGeaendertEtbHandler,
  QuittungAbgegebenEtbHandler,
  LueckeGemeldetEtbHandler,
  QuittungUeberfaelligEtbHandler,
  SicherungspostenEingerichtetEtbHandler,
  SicherungspostenAktualisiertEtbHandler,
  VorfallGemeldetEtbHandler,
  VorfallExportiertEtbHandler,
} from './event-handlers';
import {
  EinheitErstelltEtbHandler,
  EinheitStatusGeaendertEtbHandler,
  PersonZuEinheitZugewiesenEtbHandler,
  PersonVonEinheitEntferntEtbHandler,
} from '@application/kraefte/einsatz-einheiten/event-handlers';
import { FahrzeugEinheitZugewiesenEtbHandler } from '@application/kraefte/einsatz-fahrzeuge/event-handlers/fahrzeug-einheit-zugewiesen-etb.handler';
import { EtbQueryMapper } from './mappers';
import { GetEintraegeQueryHandler, GetErinnerungTimelineQueryHandler, GetEtbHistoryQueryHandler, GetEtbQueryHandler, GetTextbausteineHandler } from './queries';

/**
 * ETB Application Module - Event-Driven Architecture
 *
 * Event Flow:
 * 1. Domain Event wird emittiert (z.B. FmsStatusGeaendertEvent)
 * 2. Infrastructure Adapter empfängt Event (@OnEvent decorator)
 * 3. Adapter delegiert an Application Handler
 * 4. Handler erstellt ETB-Eintrag (Fire-and-Forget Pattern)
 */

/**
 * NestJS-Modul für Application Layer - ETB (Einsatztagebuch) Bounded Context.
 *
 * Dieses Modul registriert alle Command-Handler, Query-Handler, Event-Handler
 * und Mapper und macht sie über Dependency Injection verfügbar. Ermöglicht
 * Controller (Infrastructure Layer) die Handler zu nutzen, ohne direkt zu
 * importieren (Loose Coupling).
 *
 * **CQRS Pattern:**
 * - Command Handlers: State Mutation (Create ETB, Add/Update/Delete Eintrag)
 * - Query Handlers: State Reading (Get ETB, Get History, Get Eintraege)
 * - Event Handlers: Reaktion auf Domain Events (framework-agnostisch via IEventHandler)
 * - Mappers: Domain ↔ DTO Transformation
 *
 * **Clean Architecture Event Handling:**
 * Event Handlers werden via Symbol Token registriert (EVENT_HANDLER.ETB_AUTO_CREATION).
 * Infrastructure Event Adapters delegieren an diese Handlers (siehe LagekarteEventsModule).
 *
 * **Warum separate Module pro Bounded Context:**
 * - Klare Modul-Grenzen entsprechend DDD
 * - Selektives Testen möglich (nur ETB-Context)
 * - Einfachere Migration zu Microservices
 * - Dependency Injection Scope pro Context
 *
 * @example
 * ```typescript
 * // In Module imports:
 * @Module({
 *   imports: [EtbApplicationModule, EtbInfrastructureModule],
 * })
 * export class EtbModule {}
 * ```
 */
@Module({
  imports: [
    // Event Infrastructure (IEventPublisher) - keine zirkuläre Abhängigkeit mehr
    EventInfrastructureModule,
    // Repository Infrastructure (IEtbRepository)
    EtbInfrastructureModule,
    // Repository Infrastructure (IEinsatzRepository) - für Einsatz-Existenz-Prüfung in CreateEtbHandler
    LagekarteInfrastructureModule,
    // User Infrastructure (IUserRepository) - für Benutzernamen-Auflösung in Event-Handlers (Story 5.0)
    UserInfrastructureModule,
  ],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('ETB'),
    },

    // Command Handlers (Story 3.1 + 3.2 + Issue #554)
    CreateEtbHandler,
    AddEintragHandler,
    AddKorrekturEintragHandler,
    DeleteEintragHandler,

    // Query Handlers (Story 3.3)
    GetEtbQueryHandler,
    GetEtbHistoryQueryHandler,
    GetEintraegeQueryHandler,
    GetTextbausteineHandler,
    GetErinnerungTimelineQueryHandler, // Story 5.5

    // Event Handlers (Story 3.6) - Registered via Symbol Token for Clean Architecture
    {
      provide: EVENT_HANDLER.ETB_AUTO_CREATION,
      useClass: EtbAutoCreationHandler,
    },
    // FahrzeugErfasst Event Handler (Story 3-1) - ETB-Eintrag bei Fahrzeug-Erfassung
    {
      provide: EVENT_HANDLER.FAHRZEUG_ERFASST_ETB,
      useClass: FahrzeugErfasstEventHandler,
    },
    // FmsStatusGeaendert Event Handler (Story 3-3) - ETB-Eintrag bei Status-Änderung
    {
      provide: EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB,
      useClass: FmsStatusGeaendertEventHandler,
    },
    // EinsatzPersonHinzugefuegt Event Handler (Story 4-1) - ETB-Eintrag bei Personen-Registrierung
    {
      provide: EVENT_HANDLER.EINSATZ_PERSON_HINZUGEFUEGT_ETB,
      useClass: EinsatzPersonHinzugefuegtEventHandler,
    },
    // PersonZuFahrzeugZugewiesen Event Handler (Story 4-3) - ETB-Eintrag bei Fahrzeug-Zuweisung
    {
      provide: EVENT_HANDLER.PERSON_ZU_FAHRZEUG_ZUGEWIESEN_ETB,
      useClass: PersonFahrzeugZuweisungHandler,
    },
    // PersonVonFahrzeugEntfernt Event Handler (Story 4-3) - ETB-Eintrag bei Fahrzeug-Entfernung
    {
      provide: EVENT_HANDLER.PERSON_VON_FAHRZEUG_ENTFERNT_ETB,
      useClass: PersonFahrzeugZuweisungHandler,
    },
    // RolleBesetzt Event Handler (Story 5-1) - ETB-Eintrag bei Rollenbesetzung
    {
      provide: EVENT_HANDLER.ROLLE_BESETZT_ETB,
      useClass: RolleBesetztEventHandler,
    },
    // RolleFreigegeben Event Handler (Story 5-1) - ETB-Eintrag bei Rollenfreigabe
    {
      provide: EVENT_HANDLER.ROLLE_FREIGEGEBEN_ETB,
      useClass: RolleFreigegebenEventHandler,
    },
    // ErinnerungAktualisiert Event Handler (Story 1.3 AC5) - ETB-Eintrag bei Erinnerung-Update
    {
      provide: EVENT_HANDLER.ERINNERUNG_AKTUALISIERT_ETB,
      useClass: ErinnerungAktualisiertEventHandler,
    },
    // ErinnerungGeloescht Event Handler (Story 1.4 AC5) - ETB-Eintrag bei Erinnerung-Loeschung
    {
      provide: EVENT_HANDLER.ERINNERUNG_GELOESCHT_ETB,
      useClass: ErinnerungGeloeschtEventHandler,
    },
    // ErinnerungAusgeloest Event Handler (Story 1.5 AC5) - ETB-Eintrag bei Erinnerung-Ausloesung
    {
      provide: EVENT_HANDLER.ERINNERUNG_AUSGELOEST_ETB,
      useClass: ErinnerungAusgeloestEventHandler,
    },
    // ErinnerungAcknowledged Event Handler (Story 1.6 AC5) - ETB-Eintrag bei Erinnerung-Bestaetigung
    {
      provide: EVENT_HANDLER.ERINNERUNG_ACKNOWLEDGED_ETB,
      useClass: ErinnerungAcknowledgedEventHandler,
    },
    // ErinnerungSnoozed Event Handler (Story 2.1) - ETB-Eintrag bei Erinnerung-Snooze
    {
      provide: EVENT_HANDLER.ERINNERUNG_SNOOZED_ETB,
      useClass: ErinnerungSnoozedEventHandler,
    },
    // ErinnerungRetriggered Event Handler (Story 2.2 AC2) - ETB-Eintrag bei erneuter Ausloesung nach Snooze
    {
      provide: EVENT_HANDLER.ERINNERUNG_RETRIGGERED_ETB,
      useClass: ErinnerungRetriggeredEventHandler,
    },
    // ErinnerungErledigt Event Handler (Story 2.5 AC4) - ETB-Eintrag bei Erinnerung-Erledigung
    {
      provide: EVENT_HANDLER.ERINNERUNG_ERLEDIGT_ETB,
      useClass: ErinnerungErledigtEventHandler,
    },
    // ErinnerungErstellt Event Handler (Story 5.0) - ETB-Eintrag bei Erinnerung-Erstellung
    {
      provide: EVENT_HANDLER.ERINNERUNG_ERSTELLT_ETB,
      useClass: ErinnerungErstelltEventHandler,
    },
    // ErinnerungAssigned Event Handler (Story 5.0) - ETB-Eintrag bei Erinnerung-Zuweisung
    {
      provide: EVENT_HANDLER.ERINNERUNG_ASSIGNED_ETB,
      useClass: ErinnerungAssignedEventHandler,
    },
    // ErinnerungEskaliert Event Handler (Story 5.0) - ETB-Eintrag bei Erinnerung-Eskalation
    {
      provide: EVENT_HANDLER.ERINNERUNG_ESKALIERT_ETB,
      useClass: ErinnerungEskaliertEventHandler,
    },
    // ErinnerungIntensiviert Event Handler (Story 5.0) - ETB-Eintrag bei Erinnerung-Intensivierung
    {
      provide: EVENT_HANDLER.ERINNERUNG_INTENSIVIERT_ETB,
      useClass: ErinnerungIntensiviertEventHandler,
    },
    // FuehrungsrhythmusAktiviert Event Handler (Story 6.7) - ETB-Eintrag bei Fuehrungsrhythmus-Aktivierung
    {
      provide: EVENT_HANDLER.FUEHRUNGSRHYTHMUS_AKTIVIERT_ETB,
      useClass: FuehrungsrhythmusAktiviertEtbHandler,
    },
    // NotizErstellt Event Handler (Story 7.1) - ETB-Eintrag bei Notiz-Erstellung
    {
      provide: EVENT_HANDLER.NOTIZ_ERSTELLT_ETB,
      useClass: NotizErstelltEtbHandler,
    },
    // NotizAktualisiert Event Handler (Story 7.3) - ETB-Eintrag bei Notiz-Aktualisierung
    {
      provide: EVENT_HANDLER.NOTIZ_AKTUALISIERT_ETB,
      useClass: NotizAktualisiertEtbHandler,
    },
    // NotizGeloescht Event Handler (Story 7.4) - ETB-Eintrag bei Notiz-Loeschung
    {
      provide: EVENT_HANDLER.NOTIZ_GELOESCHT_ETB,
      useClass: NotizGeloeschtEtbHandler,
    },
    // BefehlErstellt ETB Event Handler (Story 4.3) - ETB-Eintrag bei Befehl-Erstellung
    {
      provide: EVENT_HANDLER.BEFEHL_ERSTELLT_ETB,
      useClass: BefehlErstelltEtbHandler,
    },
    // BefehlQuittiert ETB Event Handler (Story 4.3) - ETB-Eintrag bei Befehl-Quittierung
    {
      provide: EVENT_HANDLER.BEFEHL_QUITTIERT_ETB,
      useClass: BefehlQuittiertEtbHandler,
    },
    // BefehlStatusGeaendert ETB Event Handler - ETB-Eintrag bei Status-Aenderung
    {
      provide: EVENT_HANDLER.BEFEHL_STATUS_GEAENDERT_ETB,
      useClass: BefehlStatusGeaendertEtbHandler,
    },
    // BefehlZugestellt ETB Event Handler - ETB-Eintrag bei Zustellung
    {
      provide: EVENT_HANDLER.BEFEHL_ZUGESTELLT_ETB,
      useClass: BefehlZugestelltEtbHandler,
    },
    // RolleGeaendert ETB Event Handler (Story 5.4 AC4) - ETB-Eintrag bei Rollenänderung
    {
      provide: EVENT_HANDLER.ROLLE_GEAENDERT_ETB,
      useClass: RolleGeaendertEtbHandler,
    },
    // BefehlAnonymisiert ETB Event Handler (Story 5.5 AC2) - ETB-Eintrag bei DSGVO-Anonymisierung
    {
      provide: EVENT_HANDLER.BEFEHL_ANONYMISIERT_ETB,
      useClass: BefehlAnonymisiertEtbHandler,
    },
    // BefehlGeloescht ETB Event Handler (Story 5.5 AC3) - ETB-Eintrag bei DSGVO-Löschung
    {
      provide: EVENT_HANDLER.BEFEHL_GELOESCHT_ETB,
      useClass: BefehlGeloeschtEtbHandler,
    },
    // EinsatzCompleted ETB-Lock Handler (Issue #581) - ETB automatisch sperren bei Einsatz-Abschluss
    {
      provide: EVENT_HANDLER.ETB_EINSATZ_COMPLETED,
      useClass: EtbEinsatzCompletedHandler,
    },
    // GefahrenmatrixAktualisiert ETB Event Handler (Issue #414) - ETB-Eintrag bei Gefahrenbewertung
    {
      provide: EVENT_HANDLER.GEFAHRENMATRIX_AKTUALISIERT_ETB,
      useClass: GefahrenmatrixAktualisiertEtbHandler,
    },
    // EinheitErstellt ETB Event Handler (Issue #411) - ETB-Eintrag bei Einheit-Aufstellung
    {
      provide: EVENT_HANDLER.EINHEIT_ERSTELLT_ETB,
      useClass: EinheitErstelltEtbHandler,
    },
    // EinheitStatusGeaendert ETB Event Handler (Issue #411) - ETB-Eintrag bei Statusänderung
    {
      provide: EVENT_HANDLER.EINHEIT_STATUS_GEAENDERT_ETB,
      useClass: EinheitStatusGeaendertEtbHandler,
    },
    // PersonZuEinheitZugewiesen ETB Event Handler (Issue #411) - ETB-Eintrag bei Personen-Zuweisung
    {
      provide: EVENT_HANDLER.PERSON_ZU_EINHEIT_ZUGEWIESEN_ETB,
      useClass: PersonZuEinheitZugewiesenEtbHandler,
    },
    // PersonVonEinheitEntfernt ETB Event Handler (Issue #411) - ETB-Eintrag bei Personen-Entfernung
    {
      provide: EVENT_HANDLER.PERSON_VON_EINHEIT_ENTFERNT_ETB,
      useClass: PersonVonEinheitEntferntEtbHandler,
    },
    // FahrzeugEinheitZugewiesen ETB Event Handler (Issue #411) - ETB-Eintrag bei Fahrzeug-Einheit-Zuweisung
    {
      provide: EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB,
      useClass: FahrzeugEinheitZugewiesenEtbHandler,
    },

    // EIGENSCHUTZ → ETB Handlers (Issue 415)
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_ERSTELLT_ETB,
      useClass: GefaehrdungsbeurteilungErstelltEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT_ETB,
      useClass: GefaehrdungsbeurteilungAktualisiertEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_AUSGERUFEN_ETB,
      useClass: SicherheitsregelAusgerufenEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_QUITTIERT_ETB,
      useClass: SicherheitsregelQuittiertEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_PSA_PROFIL_GEAENDERT_ETB,
      useClass: PsaProfilGeaendertEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_ABGEGEBEN_ETB,
      useClass: QuittungAbgegebenEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_LUECKE_GEMELDET_ETB,
      useClass: LueckeGemeldetEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_UEBERFAELLIG_ETB,
      useClass: QuittungUeberfaelligEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_SICHERUNGSPOSTEN_EINGERICHTET_ETB,
      useClass: SicherungspostenEingerichtetEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_SICHERUNGSPOSTEN_AKTUALISIERT_ETB,
      useClass: SicherungspostenAktualisiertEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_VORFALL_GEMELDET_ETB,
      useClass: VorfallGemeldetEtbHandler,
    },
    {
      provide: EVENT_HANDLER.EIGENSCHUTZ_VORFALL_EXPORTIERT_ETB,
      useClass: VorfallExportiertEtbHandler,
    },

    // Mappers (Story 3.3)
    EtbQueryMapper,
  ],
  exports: [
    // Export handlers for use in Infrastructure Layer (Controllers)
    // Command Handlers
    CreateEtbHandler,
    AddEintragHandler,
    AddKorrekturEintragHandler,
    DeleteEintragHandler,

    // Query Handlers (Story 3.3)
    GetEtbQueryHandler,
    GetEtbHistoryQueryHandler,
    GetEintraegeQueryHandler,
    GetTextbausteineHandler,
    GetErinnerungTimelineQueryHandler, // Story 5.5

    // Event Handlers (exported via Symbol Token for Infrastructure Adapters)
    EVENT_HANDLER.ETB_AUTO_CREATION,
    EVENT_HANDLER.FAHRZEUG_ERFASST_ETB,
    EVENT_HANDLER.FMS_STATUS_GEAENDERT_ETB,
    EVENT_HANDLER.EINSATZ_PERSON_HINZUGEFUEGT_ETB,
    EVENT_HANDLER.PERSON_ZU_FAHRZEUG_ZUGEWIESEN_ETB,
    EVENT_HANDLER.PERSON_VON_FAHRZEUG_ENTFERNT_ETB,
    EVENT_HANDLER.ROLLE_BESETZT_ETB,
    EVENT_HANDLER.ROLLE_FREIGEGEBEN_ETB,
    EVENT_HANDLER.ERINNERUNG_AKTUALISIERT_ETB,
    EVENT_HANDLER.ERINNERUNG_GELOESCHT_ETB,
    EVENT_HANDLER.ERINNERUNG_AUSGELOEST_ETB,
    EVENT_HANDLER.ERINNERUNG_ACKNOWLEDGED_ETB,
    EVENT_HANDLER.ERINNERUNG_SNOOZED_ETB,
    EVENT_HANDLER.ERINNERUNG_RETRIGGERED_ETB,
    EVENT_HANDLER.ERINNERUNG_ERLEDIGT_ETB,
    EVENT_HANDLER.ERINNERUNG_ERSTELLT_ETB,
    EVENT_HANDLER.ERINNERUNG_ASSIGNED_ETB,
    EVENT_HANDLER.ERINNERUNG_ESKALIERT_ETB,
    EVENT_HANDLER.ERINNERUNG_INTENSIVIERT_ETB,
    EVENT_HANDLER.FUEHRUNGSRHYTHMUS_AKTIVIERT_ETB,
    EVENT_HANDLER.NOTIZ_ERSTELLT_ETB,
    EVENT_HANDLER.NOTIZ_AKTUALISIERT_ETB,
    EVENT_HANDLER.NOTIZ_GELOESCHT_ETB,
    EVENT_HANDLER.BEFEHL_ERSTELLT_ETB,
    EVENT_HANDLER.BEFEHL_QUITTIERT_ETB,
    EVENT_HANDLER.BEFEHL_STATUS_GEAENDERT_ETB,
    EVENT_HANDLER.BEFEHL_ZUGESTELLT_ETB,
    EVENT_HANDLER.ROLLE_GEAENDERT_ETB,
    EVENT_HANDLER.BEFEHL_ANONYMISIERT_ETB,
    EVENT_HANDLER.BEFEHL_GELOESCHT_ETB,
    EVENT_HANDLER.ETB_EINSATZ_COMPLETED,
    EVENT_HANDLER.GEFAHRENMATRIX_AKTUALISIERT_ETB, // Issue #414
    EVENT_HANDLER.EINHEIT_ERSTELLT_ETB, // Issue #411
    EVENT_HANDLER.EINHEIT_STATUS_GEAENDERT_ETB, // Issue #411
    EVENT_HANDLER.PERSON_ZU_EINHEIT_ZUGEWIESEN_ETB, // Issue #411
    EVENT_HANDLER.PERSON_VON_EINHEIT_ENTFERNT_ETB, // Issue #411
    EVENT_HANDLER.FAHRZEUG_EINHEIT_ZUGEWIESEN_ETB, // Issue #411
    EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_ERSTELLT_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_AUSGERUFEN_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_QUITTIERT_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_PSA_PROFIL_GEAENDERT_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_ABGEGEBEN_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_LUECKE_GEMELDET_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_UEBERFAELLIG_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_SICHERUNGSPOSTEN_EINGERICHTET_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_SICHERUNGSPOSTEN_AKTUALISIERT_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_VORFALL_GEMELDET_ETB, // Issue 415
    EVENT_HANDLER.EIGENSCHUTZ_VORFALL_EXPORTIERT_ETB, // Issue 415

    // Mappers (Story 3.3)
    EtbQueryMapper,
  ],
})
export class EtbApplicationModule {}
