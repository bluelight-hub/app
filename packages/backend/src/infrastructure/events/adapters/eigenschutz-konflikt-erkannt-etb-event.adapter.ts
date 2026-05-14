/**
 * Infrastructure Event Adapter für KonfliktErkannt → ETB (Issue 415).
 *
 * Fire-and-Forget mit Circuit-Breaker (analog `BefehlErstelltEtbEventAdapter`).
 *
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für KonfliktErkannt ETB-Eintrag.
 */
@Injectable()
export class EigenschutzKonfliktErkanntEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_KONFLIKT_ERKANNT_ETB)
    private readonly handler: IEventHandler<KonfliktErkanntEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(KonfliktErkanntEvent.eventName())
  async onKonfliktErkannt(event: KonfliktErkanntEvent): Promise<void> {
    this.logger.log('Received KonfliktErkanntEvent for ETB', {
      einsatzId: event.einsatzId,
      entityType: event.entityType,
      entityId: event.entityId,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for KonfliktErkannt', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
