/**
 * Infrastructure Event Adapter für QuittungUeberfaellig → ETB
 * (Issue 415).
 *
 * **System-Event:** `event.userId === 'SYSTEM'` (Scheduler-getrieben).
 *
 * Fire-and-Forget mit Circuit-Breaker (analog
 * `BefehlErstelltEtbEventAdapter`).
 *
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für QuittungUeberfaellig ETB-Eintrag.
 */
@Injectable()
export class EigenschutzQuittungUeberfaelligEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_UEBERFAELLIG_ETB)
    private readonly handler: IEventHandler<QuittungUeberfaelligEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(QuittungUeberfaelligEvent.eventName())
  async onQuittungUeberfaellig(event: QuittungUeberfaelligEvent): Promise<void> {
    this.logger.log('Received QuittungUeberfaelligEvent for ETB', {
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      propagationGroupId: event.propagationGroupId,
      ueberfaelligSeitMin: event.ueberfaelligSeitMin,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for QuittungUeberfaellig', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
