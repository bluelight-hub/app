/**
 * Infrastructure Event Adapter fuer BefehlAnonymisiert ETB Event Handling.
 *
 * @module infrastructure/events/adapters
 * @see EVENT_HANDLER.BEFEHL_ANONYMISIERT_ETB - DI Token
 * @remarks Story 5.5 AC2
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlAnonymisiertEvent } from '@domain/events/befehl-anonymisiert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlAnonymisiert ETB-Eintrag Creation.
 *
 * Empfaengt BefehlAnonymisiertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 */
@Injectable()
export class BefehlAnonymisiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_ANONYMISIERT_ETB)
    private readonly handler: IEventHandler<BefehlAnonymisiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(BefehlAnonymisiertEvent.eventName())
  async onBefehlAnonymisiert(event: BefehlAnonymisiertEvent): Promise<void> {
    this.logger.log(`Received BefehlAnonymisiertEvent for ETB`, {
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
