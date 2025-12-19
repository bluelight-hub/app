import { Module } from '@nestjs/common';
import { EtbEventAdapter, LagekarteEventAdapter, FahrzeugErfasstEventAdapter, FmsStatusGeaendertEventAdapter, EinsatzPersonHinzugefuegtEventAdapter } from './adapters';
import { EtbApplicationModule } from '@application/etb/etb-application.module';
import { LagekarteApplicationModule } from '@application/lagekarte/lagekarte-application.module';
import { LagekarteEventLoggerHandler } from './handlers/lagekarte-event-logger.handler';
import { EinsatzEventLoggerHandler } from './handlers/einsatz-event-logger.handler';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

/**
 * NestJS Module für Event Adapters (Framework-zu-Application Delegation).
 *
 * Dieses Modul registriert Event Adapters, die @OnEvent Decorator verwenden
 * und an framework-agnostische Application Layer Handler delegieren.
 *
 * **Clean Architecture Event Flow:**
 * 1. Domain Event wird via IEventPublisher publiziert
 * 2. EventEmitter2 triggert @OnEvent in Adapter (dieses Modul)
 * 3. Adapter injiziert Application Handler via Symbol Token
 * 4. Adapter ruft Handler.handle(event) auf
 *
 * **Dependency Flow (keine Zyklen!):**
 * ```
 * EventInfrastructureModule (IEventPublisher)
 *         ↑
 * Application Modules (publizieren Events)
 *         ↑
 * EventAdaptersModule (dieses Modul - importiert Application Modules)
 * ```
 *
 * **WICHTIG - Dependency Ordering:**
 * Dieses Modul MUSS NACH allen Application Modules initialisiert werden,
 * da es deren Event Handler injiziert. NestJS garantiert dies durch die
 * Module-Import-Reihenfolge in AppModule:
 * 1. EtbApplicationModule (exportiert Handler)
 * 2. LagekarteApplicationModule (exportiert Handler)
 * 3. EventAdaptersModule (importiert obige Module → injiziert Handler)
 *
 * **Warum Adapters statt direkte @OnEvent in Application Layer:**
 * - Application Layer bleibt framework-agnostisch (kein NestJS @OnEvent)
 * - Event Routing ist Infrastructure-Concern
 * - Einfachere Unit Tests für Application Handler (kein EventEmitter nötig)
 * - Ermöglicht Austausch der Event-Infrastruktur (z.B. zu Message Queue)
 *
 * **Registrierte Adapters:**
 * - EtbEventAdapter: Delegiert ETB-Events an EtbAutoCreationHandler
 * - LagekarteEventAdapter: Delegiert Lagekarte-Events an LagekarteAutoCreationHandler
 * - FahrzeugErfasstEventAdapter: Delegiert FahrzeugErfasst-Events an Handler
 * - FmsStatusGeaendertEventAdapter: Delegiert FmsStatusGeaendert-Events an ETB Handler
 * - EinsatzPersonHinzugefuegtEventAdapter: Delegiert EinsatzPersonHinzugefuegt-Events an ETB Handler
 * - LagekarteEventLoggerHandler: Infrastructure-spezifisches Event Logging
 * - EinsatzEventLoggerHandler: Infrastructure-spezifisches Event Logging für Einsatz-Events
 */
@Module({
  imports: [
    // Application Modules für Event Handler DI Tokens (einseitige Abhängigkeit!)
    EtbApplicationModule,
    LagekarteApplicationModule,
  ],
  providers: [
    // Logger für Event Adapters (Infrastructure Logging)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EventAdapters'),
    },
    // Event Adapters (delegate @OnEvent to Application Layer Handlers)
    EtbEventAdapter,
    LagekarteEventAdapter,
    FahrzeugErfasstEventAdapter,
    FmsStatusGeaendertEventAdapter,
    EinsatzPersonHinzugefuegtEventAdapter,
    // Event Logging Handler (Infrastructure-specific)
    LagekarteEventLoggerHandler,
    EinsatzEventLoggerHandler,
  ],
})
export class EventAdaptersModule {}
