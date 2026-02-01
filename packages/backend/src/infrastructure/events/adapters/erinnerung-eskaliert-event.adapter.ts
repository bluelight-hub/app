/**
 * Infrastructure Event Adapter fuer ErinnerungEskaliert Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (ErinnerungEskaliertEventHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see ErinnerungEskaliertEventHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ERINNERUNG_ESKALIERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
// biome-ignore lint/style/useImportType: ILogger needed for DI at runtime
import { ILogger } from '@domain/ports/i-logger.port';
import { ErinnerungEskaliertEvent } from '@domain/events/erinnerung-eskaliert.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

/**
 * NestJS Event Adapter fuer ErinnerungEskaliert ETB-Eintrag Creation.
 *
 * Empfaengt ErinnerungEskaliertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 5.0 AC2:** Automatischer ETB-Eintrag bei Erinnerung-Eskalation.
 */
@Injectable()
export class ErinnerungEskaliertEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ERINNERUNG_ESKALIERT_ETB)
    private readonly handler: IEventHandler<ErinnerungEskaliertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt ErinnerungEskaliertEvent und delegiert an Application Handler.
   *
   * @param event - ErinnerungEskaliertEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(ErinnerungEskaliertEvent.eventName())
  async onErinnerungEskaliert(event: ErinnerungEskaliertEvent): Promise<void> {
    this.logger.log(`Received ErinnerungEskaliertEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId.toString(),
      erinnerungId: event.erinnerungId.toString(),
      titel: event.titel,
      erstelltVon: event.erstelltVon.toString(),
      eskaliertAm: event.eskaliertAm.toISOString(),
      eskalationsPersonId: event.eskalationsPersonId?.toString() ?? null,
      eventName: ErinnerungEskaliertEvent.eventName(),
    });

    // Delegiert an Application Handler (Fire-and-Forget Error Handling im Handler)
    await this.handler.handle(event);
  }
}
