import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { IEventPublisher } from '@domain/services/ports/i-event-publisher.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEtbRepository } from '@domain/repositories';
import { EintragAddedEvent } from '@domain/events/eintrag-added.event';
import { NotfallAlertRequestedEvent } from '@domain/events/notfall-alert-requested.event';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { ETB_REPOSITORY, EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';

/**
 * Application-Handler: leitet aus einem Funkspruch-Eintrag mit Priorität
 * `notfall` ein {@link NotfallAlertRequestedEvent} ab, das der
 * `FunkkanalEventAdapter` per WebSocket an den Einsatz-Room broadcastet.
 *
 * **Event-Flow:**
 * 1. ETB-Aggregat emittiert {@link EintragAddedEvent} (mit Kontext).
 * 2. Dieser Handler prüft Kontext-Typ und Priorität.
 * 3. Bei Notfall: Lookup der `einsatzId` aus dem ETB-Repository.
 * 4. Publiziert {@link NotfallAlertRequestedEvent} → Adapter → Client.
 *
 * **Fire-and-Forget:** Fehler werden geloggt, nicht propagiert, damit
 * der Event-Bus nicht blockiert wird.
 */
@Injectable()
export class NotfallFunkspruchAlertHandler implements IEventHandler<EintragAddedEvent> {
  constructor(
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(ETB_REPOSITORY) private readonly etbRepository: IEtbRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: EintragAddedEvent): Promise<void> {
    if (event.kontext?.type !== 'funkspruch' || event.kontext.funkPrioritaet !== 'notfall') {
      return;
    }

    try {
      const aggregate = await this.etbRepository.findById(event.etbId);
      if (!aggregate) {
        this.logger.warn('NotfallFunkspruchAlertHandler: ETB nicht gefunden', {
          etbId: event.etbId.value,
          eintragId: event.eintragId.value,
        });
        return;
      }

      const kanalIdResult = FunkkanalId.create(event.kontext.kanalId);
      if (kanalIdResult.isFailure || !kanalIdResult.value) {
        this.logger.warn('NotfallFunkspruchAlertHandler: ungültige kanalId', {
          etbId: event.etbId.value,
          kanalId: event.kontext.kanalId,
          error: kanalIdResult.error,
        });
        return;
      }

      const alert = new NotfallAlertRequestedEvent(aggregate.einsatzId, kanalIdResult.value, event.eintragId, event.text, event.absender);

      await this.eventPublisher.publish(alert);
    } catch (error) {
      this.logger.error('NotfallFunkspruchAlertHandler: unerwarteter Fehler', {
        etbId: event.etbId.value,
        eintragId: event.eintragId.value,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
