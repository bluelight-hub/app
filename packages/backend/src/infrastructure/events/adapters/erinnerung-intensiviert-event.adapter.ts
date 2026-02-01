/**
 * Infrastructure Event Adapter fuer ErinnerungIntensiviert Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (ErinnerungIntensiviertEventHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see ErinnerungIntensiviertEventHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ERINNERUNG_INTENSIVIERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
// biome-ignore lint/style/useImportType: ILogger needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
import { ErinnerungIntensiviertEvent } from '@domain/events/erinnerung-intensiviert.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer ErinnerungIntensiviert ETB-Eintrag Creation.
 *
 * Empfaengt ErinnerungIntensiviertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 5.0 AC2:** Automatischer ETB-Eintrag bei Erinnerung-Intensivierung.
 */
@Injectable()
export class ErinnerungIntensiviertEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ERINNERUNG_INTENSIVIERT_ETB)
    private readonly handler: IEventHandler<ErinnerungIntensiviertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt ErinnerungIntensiviertEvent und delegiert an Application Handler.
   *
   * @param event - ErinnerungIntensiviertEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(ErinnerungIntensiviertEvent.eventName())
  async onErinnerungIntensiviert(event: ErinnerungIntensiviertEvent): Promise<void> {
    this.logger.log(`Received ErinnerungIntensiviertEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId.toString(),
      erinnerungId: event.erinnerungId.toString(),
      titel: event.titel,
      erstelltVon: event.erstelltVon.toString(),
      intensiviertAm: event.intensiviertAm.toISOString(),
      eventName: ErinnerungIntensiviertEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
