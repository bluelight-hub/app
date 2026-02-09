/**
 * Infrastructure Event Adapter fuer FuehrungsrhythmusAktiviert Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (FuehrungsrhythmusAktiviertEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see FuehrungsrhythmusAktiviertEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.FUEHRUNGSRHYTHMUS_AKTIVIERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
// biome-ignore lint/style/useImportType: ILogger needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
import { FuehrungsrhythmusAktiviertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-aktiviert.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer FuehrungsrhythmusAktiviert ETB-Eintrag Creation.
 *
 * Empfaengt FuehrungsrhythmusAktiviertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 6.7:** Automatischer ETB-Eintrag bei Fuehrungsrhythmus-Aktivierung.
 */
@Injectable()
export class FuehrungsrhythmusAktiviertEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.FUEHRUNGSRHYTHMUS_AKTIVIERT_ETB)
    private readonly handler: IEventHandler<FuehrungsrhythmusAktiviertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt FuehrungsrhythmusAktiviertEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'fuehrungsrhythmus-template.aktiviert' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. Methode delegiert an Application Handler via IEventHandler.handle()
   * 4. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - FuehrungsrhythmusAktiviertEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(FuehrungsrhythmusAktiviertEvent.eventName())
  async onFuehrungsrhythmusAktiviert(event: FuehrungsrhythmusAktiviertEvent): Promise<void> {
    this.logger.log(`Received FuehrungsrhythmusAktiviertEvent`, {
      eventId: event.eventId,
      templateId: event.templateId.toString(),
      einsatzId: event.einsatzId.toString(),
      erstellteErinnerungIds: event.erstellteErinnerungIds.length,
      eventName: FuehrungsrhythmusAktiviertEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
