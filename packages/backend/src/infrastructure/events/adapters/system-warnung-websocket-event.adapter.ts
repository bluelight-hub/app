/**
 * WebSocket Event Adapter fuer SystemWarnung Events.
 *
 * Transformiert SystemWarnungEvents in WebSocket-kompatibles Format
 * und emittiert sie via MonitoringGateway an /ws/monitoring Clients.
 *
 * **50ms Delay (Race Condition Prevention):**
 * Stellt sicher dass DB-Commit abgeschlossen ist bevor Clients benachrichtigt werden.
 *
 * @remarks Story 5.6 AC3
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import { LOGGER, MONITORING } from '@infrastructure/di-tokens';

/**
 * WebSocket Payload fuer system.warnung Events.
 */
export interface SystemWarnungPayload {
  warnungTyp: string;
  schwellwert: number;
  aktuellerWert: number;
  timestamp: string; // ISO 8601
}

/**
 * Minimales Interface fuer den MonitoringGateway (wird in Task 5 erstellt).
 * Ermoeglicht optionale Injection ohne harte Abhaengigkeit.
 */
export interface IMonitoringGateway {
  emitSystemWarnung(payload: SystemWarnungPayload): void;
}

@Injectable()
export class SystemWarnungWebSocketEventAdapter {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Optional() @Inject(MONITORING.GATEWAY) private readonly gateway?: IMonitoringGateway,
  ) {}

  /**
   * Empfaengt SystemWarnungEvent und emittiert WebSocket Event.
   *
   * Falls der MonitoringGateway noch nicht verfuegbar ist (Task 5),
   * wird das Event nur geloggt.
   */
  @OnEvent(EVENT_NAMES.SYSTEM.WARNUNG)
  async onSystemWarnung(event: SystemWarnungEvent): Promise<void> {
    // 50ms Delay fuer Race Condition Prevention
    await new Promise((resolve) => setTimeout(resolve, 50));

    const payload: SystemWarnungPayload = {
      warnungTyp: event.warnungTyp,
      schwellwert: event.schwellwert,
      aktuellerWert: event.aktuellerWert,
      timestamp: event.timestamp.toISOString(),
    };

    if (this.gateway) {
      try {
        this.gateway.emitSystemWarnung(payload);
        this.logger.log(`WebSocket event emitted for SystemWarnung: ${event.warnungTyp}`, 'SystemWarnungWebSocketAdapter');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to emit WebSocket event for SystemWarnung: ${errorMessage}`, 'SystemWarnungWebSocketAdapter');
      }
    } else {
      this.logger.log(`SystemWarnung received (no MonitoringGateway available yet): ${event.warnungTyp} - ${event.aktuellerWert} (Schwelle: ${event.schwellwert})`, 'SystemWarnungWebSocketAdapter');
    }
  }
}
