/**
 * Infrastructure Event Adapter für VorfallGemeldet → ETB (Issue 415).
 *
 * Fire-and-Forget mit Circuit-Breaker (analog `BefehlErstelltEtbEventAdapter`).
 *
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für VorfallGemeldet ETB-Eintrag.
 */
@Injectable()
export class EigenschutzVorfallGemeldetEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_VORFALL_GEMELDET_ETB)
    private readonly handler: IEventHandler<VorfallGemeldetEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(VorfallGemeldetEvent.eventName())
  async onVorfallGemeldet(event: VorfallGemeldetEvent): Promise<void> {
    this.logger.log('Received VorfallGemeldetEvent for ETB', {
      einsatzId: event.einsatzId,
      vorfallId: event.vorfallId,
      unfallkasseRelevant: event.unfallkasseRelevant,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for VorfallGemeldet', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
