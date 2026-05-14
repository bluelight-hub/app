/**
 * Infrastructure Event Adapter für SicherheitsregelQuittiert → ETB
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
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für SicherheitsregelQuittiert ETB-Eintrag.
 */
@Injectable()
export class EigenschutzSicherheitsregelQuittiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_QUITTIERT_ETB)
    private readonly handler: IEventHandler<SicherheitsregelQuittiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(SicherheitsregelQuittiertEvent.eventName())
  async onSicherheitsregelQuittiert(event: SicherheitsregelQuittiertEvent): Promise<void> {
    this.logger.log('Received SicherheitsregelQuittiertEvent for ETB', {
      einsatzId: event.einsatzId,
      regelId: event.regelId,
      einheitId: event.einheitId,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for SicherheitsregelQuittiert', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
