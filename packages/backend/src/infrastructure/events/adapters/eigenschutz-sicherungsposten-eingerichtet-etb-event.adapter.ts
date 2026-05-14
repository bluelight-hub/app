/**
 * Infrastructure Event Adapter für SicherungspostenEingerichtet → ETB
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
import { SicherungspostenEingerichtetEvent } from '@domain/eigenschutz/events/sicherungsposten-eingerichtet.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für SicherungspostenEingerichtet ETB-Eintrag.
 */
@Injectable()
export class EigenschutzSicherungspostenEingerichtetEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_SICHERUNGSPOSTEN_EINGERICHTET_ETB)
    private readonly handler: IEventHandler<SicherungspostenEingerichtetEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(SicherungspostenEingerichtetEvent.eventName())
  async onSicherungspostenEingerichtet(event: SicherungspostenEingerichtetEvent): Promise<void> {
    this.logger.log('Received SicherungspostenEingerichtetEvent for ETB', {
      einsatzId: event.einsatzId,
      sicherungspostenId: event.sicherungspostenId,
      bezeichnung: event.bezeichnung,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for SicherungspostenEingerichtet', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
