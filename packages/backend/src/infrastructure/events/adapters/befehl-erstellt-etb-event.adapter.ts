/**
 * Infrastructure Event Adapter fuer BefehlErstellt ETB Event Handling.
 *
 * Dieser Adapter verbindet NestJS EventEmitter Framework mit dem
 * framework-agnostischen Application Layer Event Handler.
 *
 * **Adapter Pattern:**
 * - Infrastructure Layer (dieser Adapter): @OnEvent Decorator, Framework-spezifisch
 * - Application Layer (BefehlErstelltEtbHandler): Pure TypeScript, Framework-agnostisch
 * - Delegation: Adapter delegiert Event Handling an Application Layer via IEventHandler
 *
 * **50ms Delay (Race Condition Prevention):**
 * - OutboxEventPublisher emittiert Events innerhalb der Transaction
 * - Handler koennten DB vor Commit abfragen
 * - 50ms Delay stellt sicher dass DB-Commit abgeschlossen ist
 *
 * @module infrastructure/events/adapters
 * @see IEventHandler - Domain Port Interface
 * @see BefehlErstelltEtbHandler - Application Layer Implementation
 * @see EVENT_HANDLER.BEFEHL_ERSTELLT_ETB - DI Token
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { EVENT_HANDLER, LOGGER, RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/**
 * NestJS Event Adapter fuer BefehlErstellt ETB-Eintrag Creation.
 *
 * Empfaengt BefehlErstelltEvents via @OnEvent Decorator und delegiert
 * an den Application Layer Handler fuer framework-agnostische Verarbeitung.
 *
 * **Story 4.3:** Automatischer ETB-Eintrag bei Befehl-Erstellung.
 */
@Injectable()
export class BefehlErstelltEtbEventAdapter {
  constructor(
    @Inject(EVENT_HANDLER.BEFEHL_ERSTELLT_ETB)
    private readonly handler: IEventHandler<BefehlErstelltEvent>,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists('etb');
  }

  /**
   * Empfaengt BefehlErstelltEvent und delegiert an Application Handler.
   *
   * **Event Flow:**
   * 1. OutboxEventPublisher emittiert 'befehl.erstellt' Event
   * 2. NestJS EventEmitter ruft diese Methode auf (via @OnEvent)
   * 3. 50ms Delay fuer Race Condition Prevention (DB-Commit sicherstellen)
   * 4. Methode delegiert an Application Handler via IEventHandler.handle()
   * 5. Application Handler erstellt ETB-Eintrag (Fire-and-Forget)
   *
   * @param event - BefehlErstelltEvent von OutboxEventPublisher
   * @returns Promise<void> - Keine Rueckgabe (delegiert an Handler)
   */
  @OnEvent(BefehlErstelltEvent.eventName())
  async onBefehlErstellt(event: BefehlErstelltEvent): Promise<void> {
    this.logger.log(`Received BefehlErstelltEvent for ETB`, {
      befehlId: event.befehlId.value,
      einsatzId: event.einsatzId.value,
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
