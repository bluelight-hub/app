/**
 * Infrastructure Event Adapter fuer BefehlGeloescht ETB Event Handling.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.BEFEHL_GELOESCHT_ETB - DI Token
 * @remarks Story 5.5 AC3
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlGeloeschtEvent } from '@domain/events/befehl-geloescht.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlGeloescht ETB-Eintrag Creation.
 *
 * Empfaengt BefehlGeloeschtEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 */
@Injectable()
export class BefehlGeloeschtEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_GELOESCHT_ETB)
    private readonly handler: IEventHandler<BefehlGeloeschtEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(BefehlGeloeschtEvent.eventName())
  async onBefehlGeloescht(event: BefehlGeloeschtEvent): Promise<void> {
    this.logger.log(`Received BefehlGeloeschtEvent for ETB`, {
      einsatzId: event.einsatzId.value,
      befehlCount: event.befehlCount,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded, entries queued', {
        einsatzId: event.einsatzId.value,
        error: result.error,
      });
    }
  }
}
