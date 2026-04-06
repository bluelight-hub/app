/**
 * Infrastructure Event Adapter für GefahrenmatrixAktualisiert → ETB-Eintrag.
 *
 * @module infrastructure/events/adapters
 * @see GefahrenmatrixAktualisiertEtbHandler
 * @see EVENT_HANDLER.GEFAHRENMATRIX_AKTUALISIERT_ETB
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
import { EVENT_HANDLER, LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class GefahrenmatrixAktualisiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.GEFAHRENMATRIX_AKTUALISIERT_ETB)
    private readonly handler: IEventHandler<GefahrenmatrixAktualisiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @OnEvent(GefahrenmatrixAktualisiertEvent.eventName())
  async onGefahrenmatrixAktualisiert(event: GefahrenmatrixAktualisiertEvent): Promise<void> {
    this.logger.log(`Received GefahrenmatrixAktualisiertEvent`, {
      eventId: event.eventId,
      einsatzId: event.einsatzId,
      gefahrentyp: event.gefahrentyp,
      schutzobjekt: event.schutzobjekt,
      warnstufe: event.warnstufe,
      eventName: GefahrenmatrixAktualisiertEvent.eventName(),
    });

    try {
      await this.handler.handle(event);
    } catch (error) {
      this.logger.error(`Unerwarteter Fehler im GefahrenmatrixAktualisiert Handler`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
