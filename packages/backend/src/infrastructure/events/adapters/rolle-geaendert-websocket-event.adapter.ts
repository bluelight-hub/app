/**
 * WebSocket Event Adapter fuer RolleGeaendert Domain Events.
 *
 * Story 5.4 AC3: Bei Rollenaenderung → Broadcast an alle Clients im Einsatz-Room.
 * Clients invalidieren ihren Rollen-Cache und aktualisieren Berechtigungen.
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
import { RolleGeaendertEvent } from '@domain/events/rolle-geaendert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { BefehlGateway } from '@/modules/befehl/gateways/befehl.gateway';

@Injectable()
export class RolleGeaendertWebsocketEventAdapter {
  constructor(
    private readonly gateway: BefehlGateway,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Empfaengt RolleGeaendertEvent und emittiert WebSocket Event.
   *
   * 50ms Delay fuer Race Condition Prevention (wie andere Adapter).
   */
  @OnEvent(RolleGeaendertEvent.eventName())
  async onRolleGeaendert(event: RolleGeaendertEvent): Promise<void> {
    this.logger.log(`Processing RolleGeaendert for WebSocket: einsatzId=${event.einsatzId}, userId=${event.userId}`, 'RolleGeaendertWebsocketEventAdapter');

    // 50ms Delay fuer Race Condition Prevention (DB-Commit abwarten)
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      this.gateway.emitRolleGeaendert({
        einsatzId: event.einsatzId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`WebSocket event emitted for RolleGeaendert: einsatzId=${event.einsatzId}`, 'RolleGeaendertWebsocketEventAdapter');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to emit WebSocket event for RolleGeaendert: einsatzId=${event.einsatzId}, error=${errorMessage}`, 'RolleGeaendertWebsocketEventAdapter');
    }
  }
}
