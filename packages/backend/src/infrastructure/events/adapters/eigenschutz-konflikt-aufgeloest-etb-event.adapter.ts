/**
 * Infrastructure Event Adapter für KonfliktAufgeloest → ETB (Issue 415).
 *
 * Fire-and-Forget mit Circuit-Breaker (analog `BefehlErstelltEtbEventAdapter`).
 *
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktAufgeloestEvent } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für KonfliktAufgeloest ETB-Eintrag.
 */
@Injectable()
export class EigenschutzKonfliktAufgeloestEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_KONFLIKT_AUFGELOEST_ETB)
    private readonly handler: IEventHandler<KonfliktAufgeloestEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(KonfliktAufgeloestEvent.eventName())
  async onKonfliktAufgeloest(event: KonfliktAufgeloestEvent): Promise<void> {
    this.logger.log('Received KonfliktAufgeloestEvent for ETB', {
      einsatzId: event.einsatzId,
      syncConflictId: event.syncConflictId,
      resolution: event.resolution,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for KonfliktAufgeloest', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
