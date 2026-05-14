/**
 * Infrastructure Event Adapter für LueckeGemeldet → ETB
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
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für LueckeGemeldet ETB-Eintrag.
 */
@Injectable()
export class EigenschutzLueckeGemeldetEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_LUECKE_GEMELDET_ETB)
    private readonly handler: IEventHandler<LueckeGemeldetEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(LueckeGemeldetEvent.eventName())
  async onLueckeGemeldet(event: LueckeGemeldetEvent): Promise<void> {
    this.logger.log('Received LueckeGemeldetEvent for ETB', {
      einsatzId: event.einsatzId,
      einheitId: event.einheitId,
      propagationGroupId: event.propagationGroupId,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for LueckeGemeldet', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
