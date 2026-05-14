/**
 * Infrastructure Event Adapter für QuittungAbgegeben → ETB
 * (Issue 415).
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
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für QuittungAbgegeben ETB-Eintrag.
 */
@Injectable()
export class EigenschutzQuittungAbgegebenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_QUITTUNG_ABGEGEBEN_ETB)
    private readonly handler: IEventHandler<QuittungAbgegebenEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(QuittungAbgegebenEvent.eventName())
  async onQuittungAbgegeben(event: QuittungAbgegebenEvent): Promise<void> {
    this.logger.log('Received QuittungAbgegebenEvent for ETB', {
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      propagationGroupId: event.propagationGroupId,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for QuittungAbgegeben', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
