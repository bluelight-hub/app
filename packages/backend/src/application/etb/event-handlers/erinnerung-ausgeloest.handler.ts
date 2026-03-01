/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Ausloesung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Ausloesung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 1.5 AC5):**
 * "Erinnerung '{titel}' ausgeloest"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungAusgeloestEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { ErinnerungAusgeloestEvent } from '@domain/events/erinnerung-ausgeloest.event';
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
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Ausloesung.
 *
 * Verarbeitet ErinnerungAusgeloestEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungsausloesung (Story 1.5 AC5).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Trigger wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungAusgeloestEventHandler implements IEventHandler<ErinnerungAusgeloestEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungAusgeloestEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungAusgeloestEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungAusgeloestEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for ErinnerungAusgeloest: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungAusgeloestEventHandler');

    try {
      // Validierung aller required Fields (kein By-Feld, nur Zeit)
      if (!event.titel || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungAusgeloest event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`,
          'ErinnerungAusgeloestEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag via Template
      const text = ERINNERUNG_ETB_TEMPLATES.AUSGELOEST.replace('{titel}', event.titel);

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
          eventType: 'ErinnerungAusgeloest',
          erinnerungId: event.erinnerungId.toString(),
          ausgeloestAm: event.ausgeloestAm.toISOString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungAusgeloest: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungAusgeloestEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungAusgeloest: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungAusgeloestEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for ErinnerungAusgeloest: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungAusgeloestEventHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungAusgeloest: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungAusgeloestEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
