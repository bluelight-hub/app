/**
 * Infrastructure Event Adapter: delegiert `FmsStatusGeaendertEvent` an den
 * Application-Handler `FmsStatusZuAlarmierungHandler` (Auto-Population der
 * Alarmierungs-Empfänger-Zeitpunkte).
 *
 * **Pattern analog zu den ETB-Adaptern:**
 * - 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen, da der
 *   OutboxEventPublisher das Event ggf. noch innerhalb der emittierenden
 *   Transaction publiziert).
 * - `circuitBreaker.execute('alarmierung', ...)` wrapping für resilienten
 *   Fire-and-Forget-Betrieb (Fehler werden geloggt, nicht propagiert).
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

@Injectable()
export class FmsAlarmierungZeitpunktAdapter {
  constructor(
    @Inject(EVENT_HANDLER.FMS_STATUS_ZU_ALARMIERUNG)
    private readonly handler: IEventHandler<FmsStatusGeaendertEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('alarmierung');
  }

  @OnEvent(FmsStatusGeaendertEvent.eventName())
  async onFmsStatusGeaendert(event: FmsStatusGeaendertEvent): Promise<void> {
    this.logger.log(
      `Received FmsStatusGeaendertEvent for Alarmierung Auto-Population: einsatzId=${event.einsatzId}, einsatzFahrzeugId=${event.einsatzFahrzeugId}, neuerStatus=${event.neuerStatus}`,
      FmsAlarmierungZeitpunktAdapter.name,
    );

    // 50ms Delay für Race Condition Prevention (DB-Commit sicherstellen)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await this.circuitBreaker.execute('alarmierung', () => this.handler.handle(event));
    if (result.isFailure) {
      this.logger.warn('Alarmierung-Auto-Population degraded', {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        error: result.error,
      });
    }
  }
}
