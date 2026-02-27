/**
 * Infrastructure Event Adapter fuer BefehlZugestellt ETB Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * @module infrastructure/events/adapters
 * @see BefehlZugestelltEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.BEFEHL_ZUGESTELLT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlZugestellt ETB-Eintrag.
 *
 * Empfaengt BefehlZugestelltEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 */
@Injectable()
export class BefehlZugestelltEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_ZUGESTELLT_ETB)
    private readonly handler: IEventHandler<BefehlZugestelltEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  /**
   * Empfaengt BefehlZugestelltEvent und delegiert an Application Handler.
   *
   * Enthaelt 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen).
   *
   * @param event - BefehlZugestelltEvent von OutboxEventPublisher
   */
  @OnEvent(BefehlZugestelltEvent.eventName())
  async onBefehlZugestellt(event: BefehlZugestelltEvent): Promise<void> {
    this.logger.log(`Received BefehlZugestelltEvent for ETB`, {
      befehlId: event.befehlId.value,
      einsatzId: event.einsatzId.value,
      empfaengerName: event.empfaengerName,
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
