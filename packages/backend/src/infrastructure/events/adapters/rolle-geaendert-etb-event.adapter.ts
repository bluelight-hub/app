/**
 * Infrastructure Event Adapter fuer RolleGeaendert ETB Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * @module infrastructure/events/adapters
 * @see RolleGeaendertEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.ROLLE_GEAENDERT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { RolleGeaendertEvent } from '@domain/events/rolle-geaendert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer RolleGeaendert ETB-Eintrag Creation.
 *
 * Empfaengt RolleGeaendertEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 5.4 AC4:** Automatischer ETB-Eintrag bei Rollenänderung.
 */
@Injectable()
export class RolleGeaendertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.ROLLE_GEAENDERT_ETB)
    private readonly handler: IEventHandler<RolleGeaendertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  /**
   * Empfaengt RolleGeaendertEvent und delegiert an Application Handler.
   *
   * Enthaelt 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen).
   *
   * @param event - RolleGeaendertEvent von OutboxEventPublisher
   */
  @OnEvent(RolleGeaendertEvent.eventName())
  async onRolleGeaendert(event: RolleGeaendertEvent): Promise<void> {
    this.logger.log(`Received RolleGeaendertEvent for ETB`, {
      einsatzId: event.einsatzId,
      userId: event.userId,
      userName: event.userName,
      alteRolle: event.alteRolle,
      neueRolle: event.neueRolle,
    });

    // 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Delegiert an Application Handler mit Circuit Breaker Tracking (Fire-and-Forget)
    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded, entries queued', {
        einsatzId: event.einsatzId,
        userId: event.userId,
        error: result.error,
      });
    }
  }
}
