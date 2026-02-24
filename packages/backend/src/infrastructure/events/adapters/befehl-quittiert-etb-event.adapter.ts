/**
 * Infrastructure Event Adapter fuer BefehlQuittiert ETB Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * @module infrastructure/events/adapters
 * @see BefehlQuittiertEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.BEFEHL_QUITTIERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlQuittiert ETB-Eintrag.
 *
 * Empfaengt BefehlQuittiertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 */
@Injectable()
export class BefehlQuittiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_QUITTIERT_ETB)
    private readonly handler: IEventHandler<BefehlQuittiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  /**
   * Empfaengt BefehlQuittiertEvent und delegiert an Application Handler.
   *
   * Enthaelt 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen).
   *
   * @param event - BefehlQuittiertEvent von OutboxEventPublisher
   */
  @OnEvent(BefehlQuittiertEvent.eventName())
  async onBefehlQuittiert(event: BefehlQuittiertEvent): Promise<void> {
    this.logger.log(`Received BefehlQuittiertEvent for ETB`, {
      befehlId: event.befehlId.value,
      einsatzId: event.einsatzId.value,
      empfaengerId: event.empfaengerId.value,
      quittierungArt: event.quittierungArt,
      nummer: event.nummer,
    });

    // 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Delegiert an Application Handler mit Circuit Breaker Tracking (Fire-and-Forget)
    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded, entries queued', {
        befehlId: event.befehlId.value,
        error: result.error,
      });
    }
  }
}
