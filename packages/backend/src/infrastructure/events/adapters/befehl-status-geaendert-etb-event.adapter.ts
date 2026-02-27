/**
 * Infrastructure Event Adapter fuer BefehlStatusGeaendert ETB Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * @module infrastructure/events/adapters
 * @see BefehlStatusGeaendertEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.BEFEHL_STATUS_GEAENDERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlStatusGeaendert ETB-Eintrag.
 *
 * Empfaengt BefehlStatusGeaendertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 */
@Injectable()
export class BefehlStatusGeaendertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_STATUS_GEAENDERT_ETB)
    private readonly handler: IEventHandler<BefehlStatusGeaendertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  /**
   * Empfaengt BefehlStatusGeaendertEvent und delegiert an Application Handler.
   *
   * Enthaelt 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen).
   *
   * @param event - BefehlStatusGeaendertEvent von OutboxEventPublisher
   */
  @OnEvent(BefehlStatusGeaendertEvent.eventName())
  async onBefehlStatusGeaendert(event: BefehlStatusGeaendertEvent): Promise<void> {
    this.logger.log(`Received BefehlStatusGeaendertEvent for ETB`, {
      befehlId: event.befehlId.value,
      einsatzId: event.einsatzId.value,
      oldStatus: event.oldStatus.value,
      newStatus: event.newStatus.value,
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
