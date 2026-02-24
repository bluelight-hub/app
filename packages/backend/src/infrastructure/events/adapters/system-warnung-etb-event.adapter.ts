/**
 * Infrastructure Event Adapter fuer SystemWarnung ETB/Audit Event Handling.
 *
 * Loggt Systemwarnungen als strukturierten Audit-Trail.
 * Da SystemWarnung keinen Einsatz-Kontext hat (systemweites Monitoring),
 * wird kein ETB-Eintrag erstellt, sondern ein strukturierter Audit-Log
 * (analog zu AufbewahrungsKonfigurationGeaendertEtbEventAdapter).
 *
 * **50ms Delay (Race Condition Prevention):**
 * Stellt sicher dass DB-Commit abgeschlossen ist.
 *
 * @remarks Story 5.6 AC3
 * @module infrastructure/events/adapters
 */
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ILogger } from '@domain/ports/i-logger.port';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { EVENT_NAMES } from '@domain/events/event-names';
import { LOGGER } from '@infrastructure/di-tokens';

@Injectable()
export class SystemWarnungEtbEventAdapter {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Empfaengt SystemWarnungEvent und erstellt Audit-Log.
   *
   * ETB-Text-Format: "Systemwarnung: {warnungTyp} - {aktuellerWert} (Schwelle: {schwellwert})"
   */
  @OnEvent(EVENT_NAMES.SYSTEM.WARNUNG)
  async onSystemWarnung(event: SystemWarnungEvent): Promise<void> {
    // 50ms Delay fuer Race Condition Prevention
    await new Promise((resolve) => setTimeout(resolve, 50));

    const text = `Systemwarnung: ${event.warnungTyp} - ${event.aktuellerWert} (Schwelle: ${event.schwellwert})`;

    this.logger.log(text, {
      eventType: 'SystemWarnung',
      kategorie: 'SYSTEM',
      warnungTyp: event.warnungTyp,
      schwellwert: event.schwellwert,
      aktuellerWert: event.aktuellerWert,
      timestamp: event.timestamp.toISOString(),
    });
  }
}
