/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Snooze.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Snooze-Operation
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 2.1):**
 * "Erinnerung '{titel}' gesnoozed für {snoozeMinutes} Minuten (#{snoozeCount})"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungSnoozedEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { ErinnerungSnoozedEvent } from '@domain/events/erinnerung-snoozed.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { ERINNERUNG_ETB_TEMPLATES } from '@application/etb/constants';

/**
 * ETB Kategorie fuer Erinnerungen (Story 5.1 AC2).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_ERINNERUNG: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Snooze.
 *
 * Verarbeitet ErinnerungSnoozedEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation des Snoozens (Story 2.1).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Snooze wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungSnoozedEventHandler implements IEventHandler<ErinnerungSnoozedEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungSnoozedEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungSnoozedEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungSnoozedEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for ErinnerungSnoozed: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, snoozeMinutes=${event.snoozeMinutes}`,
      'ErinnerungSnoozedEventHandler',
    );

    try {
      // H3 Fix: Validierung aller required Fields (nicht nur titel)
      if (!event.titel || !event.snoozedBy || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungSnoozed event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, snoozedBy=${event.snoozedBy}`,
          'ErinnerungSnoozedEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag via Template
      const dauer = `${event.snoozeMinutes} Minuten`;
      const text = ERINNERUNG_ETB_TEMPLATES.SNOOZED.replace('{titel}', event.titel).replace('{dauer}', dauer);

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.snoozedBy.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'ErinnerungSnoozed',
          erinnerungId: event.erinnerungId.toString(),
          snoozedAt: event.snoozedAt.toISOString(),
          snoozedUntil: event.snoozedUntil.toISOString(),
          snoozedBy: event.snoozedBy.toString(),
          snoozeMinutes: event.snoozeMinutes,
          snoozeCount: event.snoozeCount,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungSnoozed: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungSnoozedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungSnoozed: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungSnoozedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for ErinnerungSnoozed: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, snoozeMinutes=${event.snoozeMinutes}`,
        'ErinnerungSnoozedEventHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungSnoozed: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungSnoozedEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
