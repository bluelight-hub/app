/**
 * Infrastructure Event Adapter fuer NotizAktualisiert Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (NotizAktualisiertEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see NotizAktualisiertEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.NOTIZ_AKTUALISIERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
// biome-ignore lint/style/useImportType: ILogger needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
import { NotizAktualisiertEvent } from '@domain/notiz/events/notiz-aktualisiert.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer NotizAktualisiert ETB-Eintrag Creation.
 *
 * Empfaengt NotizAktualisiertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 7.3:** Automatischer ETB-Eintrag bei Notiz-Aktualisierung.
 */
@Injectable()
export class NotizAktualisiertEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.NOTIZ_AKTUALISIERT_ETB)
    private readonly handler: IEventHandler<NotizAktualisiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt NotizAktualisiertEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'notiz.aktualisiert' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - NotizAktualisiertEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(NotizAktualisiertEvent.eventName())
  async onNotizAktualisiert(event: NotizAktualisiertEvent): Promise<void> {
    this.logger.log(`Received NotizAktualisiertEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      notizId: event.notizId.toString(),
      titel: event.titel,
      eventName: NotizAktualisiertEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
