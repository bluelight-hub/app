/**
 * Infrastructure Event Adapter für PsaProfilGeaendert → ETB
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
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter für PsaProfilGeaendert ETB-Eintrag.
 */
@Injectable()
export class EigenschutzPsaProfilGeaendertEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.EIGENSCHUTZ_PSA_PROFIL_GEAENDERT_ETB)
    private readonly handler: IEventHandler<PsaProfilGeaendertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  @OnEvent(PsaProfilGeaendertEvent.eventName())
  async onPsaProfilGeaendert(event: PsaProfilGeaendertEvent): Promise<void> {
    this.logger.log('Received PsaProfilGeaendertEvent for ETB', {
      einsatzId: event.einsatzId,
      zuweisungId: event.zuweisungId,
      profil: event.profil,
      aktion: event.aktion,
    });

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('etb', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('ETB-Integration degraded for PsaProfilGeaendert', {
        einsatzId: event.einsatzId,
        error: result.error,
      });
    }
  }
}
