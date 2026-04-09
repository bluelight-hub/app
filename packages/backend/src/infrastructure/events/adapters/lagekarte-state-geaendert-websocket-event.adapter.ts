/**
 * WebSocket Event Adapter für LagekarteStateGeaendert Domain Events.
 *
 * Issue #638: Bei Lagekarte-State-Änderung → Broadcast an alle Clients im Einsatz-Room.
 * Clients aktualisieren ihren lokalen State (Invalidierung des Caches).
 *
 * **Fire-and-Forget Pattern:**
 * - Fehler werden geloggt, nicht propagiert
 * - WebSocket-Emission darf Domain-Flow nicht blockieren
 *
 * @module infrastructure/events/adapters
 */
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { LagekarteStateGeaendertEvent } from '@domain/events/lagekarte-state-geaendert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { LagekarteGateway } from '@/modules/lagekarte/gateways/lagekarte.gateway';

@Injectable()
export class LagekarteStateGeaendertWebsocketEventAdapter {
  constructor(
    private readonly gateway: LagekarteGateway,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfängt LagekarteStateGeaendertEvent und emittiert WebSocket Event.
   *
   * 50ms Delay für Race Condition Prevention (DB-Commit abwarten).
   */
  @OnEvent(LagekarteStateGeaendertEvent.eventName())
  async onLagekarteStateGeaendert(event: LagekarteStateGeaendertEvent): Promise<void> {
    this.logger.log(`Processing LagekarteStateGeaendert for WebSocket: lagekarteId=${event.lagekarteId.value}, einsatzId=${event.einsatzId.value}`, 'LagekarteStateGeaendertWebsocketEventAdapter');

    // 50ms Delay für Race Condition Prevention (DB-Commit abwarten)
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitStateGeaendert({
        einsatzId: event.einsatzId.value,
        lagekarteId: event.lagekarteId.value,
        changedBy: event.changedBy.value,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`WebSocket event emitted for LagekarteStateGeaendert: lagekarteId=${event.lagekarteId.value}`, 'LagekarteStateGeaendertWebsocketEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for LagekarteStateGeaendert: lagekarteId=${event.lagekarteId.value}, error=${errorMessage}`, 'LagekarteStateGeaendertWebsocketEventAdapter');
    }
  }
}
