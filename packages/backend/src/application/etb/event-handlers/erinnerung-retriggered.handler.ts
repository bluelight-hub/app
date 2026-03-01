/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Re-Trigger nach Snooze.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um den Re-Trigger
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 2.2 AC2):**
 * "Erinnerung '{titel}' erneut ausgelöst (X. Auslösung nach Y-mal Snooze)"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungRetriggeredEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { ErinnerungRetriggeredEvent } from '@domain/events/erinnerung-retriggered.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { ERINNERUNG_ETB_TEMPLATES } from '../constants/erinnerung-etb-templates';

/**
 * ETB Kategorie fuer Erinnerungen (Story 5.1 AC2).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_ERINNERUNG: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Re-Trigger nach Snooze.
 *
 * Verarbeitet ErinnerungRetriggeredEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der erneuten Ausloesung mit Snooze-Historie (Story 2.2 AC2).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Re-Trigger wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungRetriggeredEventHandler implements IEventHandler<ErinnerungRetriggeredEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungRetriggeredEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungRetriggeredEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungRetriggeredEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for ErinnerungRetriggered: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, snoozeCount=${event.snoozeCount}`,
      'ErinnerungRetriggeredEventHandler',
    );

    try {
      // Validierung aller required Fields (kein By-Feld, nur Zeit)
      if (!event.titel || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungRetriggered event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`,
          'ErinnerungRetriggeredEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag via Template
      const text = ERINNERUNG_ETB_TEMPLATES.RETRIGGERED.replace('{titel}', event.titel);

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.erstelltVon.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'ErinnerungRetriggered',
          erinnerungId: event.erinnerungId.toString(),
          retriggeredAm: event.retriggeredAm.toISOString(),
          snoozeCount: event.snoozeCount,
          previousSnoozedAt: event.previousSnoozedAt?.toISOString() ?? null,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungRetriggered: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungRetriggeredEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungRetriggered: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungRetriggeredEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for ErinnerungRetriggered: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, snoozeCount=${event.snoozeCount}`,
        'ErinnerungRetriggeredEventHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungRetriggered: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungRetriggeredEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
