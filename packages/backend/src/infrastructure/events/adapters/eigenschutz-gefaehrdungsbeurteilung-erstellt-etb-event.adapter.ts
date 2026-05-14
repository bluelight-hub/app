/**
 * Infrastructure Event Adapter für GefaehrdungsbeurteilungErstellt → ETB
 * (Issue 415).
 *
 * Verbindet NestJS EventEmitter mit dem framework-agnostischen Application
 * Layer Handler. Fire-and-Forget mit Circuit-Breaker (analog
 * `BefehlErstelltEtbEventAdapter`).
 *
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für GefaehrdungsbeurteilungErstellt ETB-Eintrag.
 */
@Injectable()
export class EigenschutzGefaehrdungsbeurteilungErstelltEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_ERSTELLT_ETB)
    private readonly handler: IEventHandler<GefaehrdungsbeurteilungErstelltEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(GefaehrdungsbeurteilungErstelltEvent.eventName())
  async onGefaehrdungsbeurteilungErstellt(event: GefaehrdungsbeurteilungErstelltEvent): Promise<void> {
    this.logger.log('Received GefaehrdungsbeurteilungErstelltEvent for ETB', {
      einsatzId: event.einsatzId,
      gbId: event.gefaehrdungsbeurteilungId,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for GefaehrdungsbeurteilungErstellt', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
