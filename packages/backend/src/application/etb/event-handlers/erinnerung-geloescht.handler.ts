/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Loeschung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Loeschung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 1.4 AC5):**
 * "Erinnerung '{titel}' geloescht"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungGeloeschtEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { ErinnerungGeloeschtEvent } from '@domain/events/erinnerung-geloescht.event';
import { LOGGER } from '@infrastructure/di-tokens';
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
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Loeschung.
 *
 * Verarbeitet ErinnerungGeloeschtEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungsloeschung (Story 1.4 AC5).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Delete wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungGeloeschtEventHandler implements IEventHandler<ErinnerungGeloeschtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungGeloeschtEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungGeloeschtEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungGeloeschtEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for ErinnerungGeloescht: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungGeloeschtEventHandler');

    try {
      // Validierung aller required Fields
      if (!event.titel || !event.geloeschtVon || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungGeloescht event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, geloeschtVon=${event.geloeschtVon}`,
          'ErinnerungGeloeschtEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag via Template
      const text = ERINNERUNG_ETB_TEMPLATES.GELOESCHT.replace('{titel}', event.titel);

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.geloeschtVon.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'ErinnerungGeloescht',
          erinnerungId: event.erinnerungId.toString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungGeloescht: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungGeloeschtEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungGeloescht: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungGeloeschtEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for ErinnerungGeloescht: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}`, 'ErinnerungGeloeschtEventHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungGeloescht: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungGeloeschtEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
