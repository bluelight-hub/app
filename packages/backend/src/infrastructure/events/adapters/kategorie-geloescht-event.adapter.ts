/**
 * Infrastructure Event Adapter fuer KategorieGeloescht Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (KategorieGeloeschtEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see KategorieGeloeschtEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.KATEGORIE_GELOESCHT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
// biome-ignore lint/style/useImportType: ILogger needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
import { KategorieGeloeschtEvent } from '@domain/kategorie/events/kategorie-geloescht.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer KategorieGeloescht ETB-Eintrag Creation.
 *
 * Empfaengt KategorieGeloeschtEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 8.1:** Automatischer ETB-Eintrag bei Kategorie-Loeschung.
 */
@Injectable()
export class KategorieGeloeschtEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.KATEGORIE_GELOESCHT_ETB)
    private readonly handler: IEventHandler<KategorieGeloeschtEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt KategorieGeloeschtEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'kategorie.geloescht' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - KategorieGeloeschtEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(KategorieGeloeschtEvent.eventName())
  async onKategorieGeloescht(event: KategorieGeloeschtEvent): Promise<void> {
    this.logger.log(`Received KategorieGeloeschtEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      kategorieId: event.kategorieId.toString(),
      name: event.name,
      eventName: KategorieGeloeschtEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
