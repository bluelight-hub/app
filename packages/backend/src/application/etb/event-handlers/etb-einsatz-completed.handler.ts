/**
 * Automatische ETB-Sperrung bei Einsatz-Abschluss.
 *
 * Dieser Event Handler sperrt das zugehörige ETB wenn ein Einsatz
 * abgeschlossen wird. Implementiert Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * @module application/etb/event-handlers
 * @see EinsatzCompletedEvent - Trigger Event (Domain Event via Outbox)
 * @see EinsatzCompletedEtbEventAdapter - Infrastructure Adapter mit @OnEvent Decorator
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { EinsatzCompletedEvent } from '@domain/events/einsatz-completed.event';
import { IEtbRepository } from '@domain/repositories';
import { ETB_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class EtbEinsatzCompletedHandler implements IEventHandler<EinsatzCompletedEvent> {
  constructor(
    @Inject(ETB_REPOSITORY) private readonly etbRepository: IEtbRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: EinsatzCompletedEvent): Promise<void> {
    const einsatzId = event.einsatzId;

    this.logger.log(`Auto-locking ETB for completed Einsatz`, {
      einsatzId: einsatzId.value,
      completedBy: event.completedBy.value,
      occurredAt: event.occurredAt,
    });

    try {
      const aggregate = await this.etbRepository.findByEinsatzId(einsatzId);
      if (!aggregate) {
        this.logger.warn(`Kein ETB gefunden für abgeschlossenen Einsatz`, {
          einsatzId: einsatzId.value,
        });
        return;
      }

      if (aggregate.isLocked()) {
        this.logger.log(`ETB bereits gesperrt, überspringe`, {
          einsatzId: einsatzId.value,
          etbId: aggregate.id.value,
        });
        return;
      }

      const lockResult = aggregate.lock(event.completedBy);
      if (lockResult.isFailure) {
        this.logger.error(`ETB-Sperrung fehlgeschlagen`, {
          einsatzId: einsatzId.value,
          etbId: aggregate.id.value,
          error: lockResult.error,
        });
        return;
      }

      await this.etbRepository.save(aggregate);

      this.logger.log(`ETB automatisch gesperrt nach Einsatz-Abschluss`, {
        einsatzId: einsatzId.value,
        etbId: aggregate.id.value,
      });
    } catch (error) {
      this.logger.error(`Unerwarteter Fehler bei automatischer ETB-Sperrung`, {
        einsatzId: einsatzId.value,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
