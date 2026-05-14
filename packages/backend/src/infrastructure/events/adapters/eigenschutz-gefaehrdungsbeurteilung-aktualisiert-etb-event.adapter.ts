/**
 * Infrastructure Event Adapter für GefaehrdungsbeurteilungAktualisiert → ETB
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
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für GefaehrdungsbeurteilungAktualisiert ETB-Eintrag.
 */
@Injectable()
export class EigenschutzGefaehrdungsbeurteilungAktualisiertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_GEFAEHRDUNGSBEURTEILUNG_AKTUALISIERT_ETB)
    private readonly handler: IEventHandler<GefaehrdungsbeurteilungAktualisiertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(GefaehrdungsbeurteilungAktualisiertEvent.eventName())
  async onGefaehrdungsbeurteilungAktualisiert(event: GefaehrdungsbeurteilungAktualisiertEvent): Promise<void> {
    this.logger.log('Received GefaehrdungsbeurteilungAktualisiertEvent for ETB', {
      einsatzId: event.einsatzId,
      gbId: event.gefaehrdungsbeurteilungId,
      fromVersion: event.fromVersion,
      toVersion: event.toVersion,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for GefaehrdungsbeurteilungAktualisiert', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
