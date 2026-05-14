/**
 * Infrastructure Event Adapter für SicherheitsregelAusgerufen → ETB
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
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für SicherheitsregelAusgerufen ETB-Eintrag.
 */
@Injectable()
export class EigenschutzSicherheitsregelAusgerufenEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_SICHERHEITSREGEL_AUSGERUFEN_ETB)
    private readonly handler: IEventHandler<SicherheitsregelAusgerufenEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(SicherheitsregelAusgerufenEvent.eventName())
  async onSicherheitsregelAusgerufen(event: SicherheitsregelAusgerufenEvent): Promise<void> {
    this.logger.log('Received SicherheitsregelAusgerufenEvent for ETB', {
      einsatzId: event.einsatzId,
      regelId: event.regelId,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for SicherheitsregelAusgerufen', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
