/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Intensivierung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Intensivierung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 5.1 AC2):**
 * "Erinnerung '{titel}' intensiviert (Stufe {stufe})"
 *
 * Note: Da das Event keine explizite Stufe enthaelt, wird Stufe 2 (Urgent) angenommen.
 * Intensivierung tritt auf wenn keine Eskalationsperson definiert ist.
 *
 * @module application/etb/event-handlers
 * @see ErinnerungIntensiviertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { ErinnerungIntensiviertEvent } from '@domain/events/erinnerung-intensiviert.event';
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
 * Default Intensivierungsstufe fuer ETB-Eintraege.
 *
 * Stufe 2 ("Urgent") wird als Default verwendet, da Intensivierung nur auftritt,
 * wenn keine Eskalationsperson definiert ist und die Erinnerung nicht bestaetigt wurde.
 * Dies entspricht dem intensivierten Audio/visuellen Feedback im Frontend.
 *
 * @see Domain: Erinnerung-Aggregate - Intensivierungslogik
 */
const DEFAULT_INTENSIVIERUNGS_STUFE = 2;

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Intensivierung.
 *
 * Verarbeitet ErinnerungIntensiviertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungsintensivierung (Story 5.1 AC2).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Intensivierung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungIntensiviertEventHandler implements IEventHandler<ErinnerungIntensiviertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungIntensiviertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungIntensiviertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungIntensiviertEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for ErinnerungIntensiviert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, intensiviertAm=${event.intensiviertAm.toISOString()}`,
      'ErinnerungIntensiviertEventHandler',
    );

    try {
      // Validierung aller required Fields
      if (!event.titel || !event.erstelltVon || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungIntensiviert event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, intensiviertVon=${event.erstelltVon}`,
          'ErinnerungIntensiviertEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag aus Template
      // Note: Event hat keine explizite Stufe, wir verwenden Default Stufe 2
      const text = ERINNERUNG_ETB_TEMPLATES.INTENSIVIERT.replace('{titel}', event.titel).replace('{stufe}', DEFAULT_INTENSIVIERUNGS_STUFE.toString());

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
          eventType: 'ErinnerungIntensiviert',
          erinnerungId: event.erinnerungId.toString(),
          intensiviertAm: event.intensiviertAm.toISOString(),
          stufe: DEFAULT_INTENSIVIERUNGS_STUFE,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungIntensiviert: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungIntensiviertEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungIntensiviert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungIntensiviertEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for ErinnerungIntensiviert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, stufe=${DEFAULT_INTENSIVIERUNGS_STUFE}`,
        'ErinnerungIntensiviertEventHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungIntensiviert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungIntensiviertEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
