import { Inject, Injectable } from '@nestjs/common';
import type { AlarmierungZeitpunktKorrigiertEvent } from '@domain/events/alarmierung-zeitpunkt-korrigiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragHandler } from '@application/etb/commands';
import { executeAlarmierungEtbCommand } from './etb-eintrag.helper';

/**
 * Application-Handler: Schreibt für jede manuelle Zeitpunkt-Korrektur einen
 * ETB-Eintrag (Kategorie `ALARMIERUNG`) mit altem → neuem Wert.
 *
 * Text: "Zeitpunkt korrigiert ({feld}): {nameSnapshot} – {alterWert} → {neuerWert} (durch {korrigiertVon})"
 *
 * **Fire-and-Forget:** siehe {@link executeAlarmierungEtbCommand}.
 */
@Injectable()
export class AlarmierungZeitpunktKorrigiertZuEtbHandler implements IEventHandler<AlarmierungZeitpunktKorrigiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: AlarmierungZeitpunktKorrigiertEvent): Promise<void> {
    const alt = formatTimestamp(event.data.alterWert);
    const neu = formatTimestamp(event.data.neuerWert);
    const text = `Zeitpunkt korrigiert (${event.data.feld}): ${event.data.nameSnapshot} – ${alt} → ${neu} (durch ${event.data.korrigiertVon})`;
    const metadata = {
      eventType: 'AlarmierungZeitpunktKorrigiert',
      alarmierungId: event.alarmierungId.value,
      empfaengerId: event.data.empfaengerId.value,
      feld: event.data.feld,
      alterWert: event.data.alterWert?.toISOString() ?? null,
      neuerWert: event.data.neuerWert?.toISOString() ?? null,
      korrigiertVon: event.data.korrigiertVon,
    };

    await executeAlarmierungEtbCommand(this.addEintragHandler, this.logger, {
      handlerName: 'AlarmierungZeitpunktKorrigiertZuEtbHandler',
      einsatzId: event.einsatzId.value,
      alarmierungId: event.alarmierungId.value,
      text,
      metadata,
      occurredAt: event.occurredAt,
    });
  }
}

function formatTimestamp(value: Date | null): string {
  return value ? value.toISOString() : '∅';
}
