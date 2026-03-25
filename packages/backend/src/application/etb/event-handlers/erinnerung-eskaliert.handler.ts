/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Eskalation.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Eskalation
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 5.1 AC2):**
 * "Erinnerung '{titel}' eskaliert an {person}"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungEskaliertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { ErinnerungEskaliertEvent } from '@domain/events/erinnerung-eskaliert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
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
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Eskalation.
 *
 * Verarbeitet ErinnerungEskaliertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungseskalation (Story 5.1 AC2).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Eskalation wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungEskaliertEventHandler implements IEventHandler<ErinnerungEskaliertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungEskaliertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungEskaliertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungEskaliertEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for ErinnerungEskaliert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, eskalationsPersonId=${event.eskalationsPersonId}`,
      'ErinnerungEskaliertEventHandler',
    );

    try {
      // Validierung aller required Fields
      if (!event.titel || !event.erstelltVon || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungEskaliert event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, eskaliertVon=${event.erstelltVon}`,
          'ErinnerungEskaliertEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag aus Template
      // Note: eskalationsPersonId kann null sein (sollte aber bei ESKALIERT-Event nicht vorkommen)
      const personText = event.eskalationsPersonId ? event.eskalationsPersonId.toString() : 'unbekannt';
      const text = ERINNERUNG_ETB_TEMPLATES.ESKALIERT.replace('{titel}', event.titel).replace('{person}', personText);

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
          eventType: 'ErinnerungEskaliert',
          erinnerungId: event.erinnerungId.toString(),
          eskalationsPersonId: event.eskalationsPersonId?.toString() ?? null,
          eskaliertAm: event.eskaliertAm.toISOString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungEskaliert: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungEskaliertEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungEskaliert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungEskaliertEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for ErinnerungEskaliert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, eskalationsPersonId=${event.eskalationsPersonId}`,
        'ErinnerungEskaliertEventHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungEskaliert: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, eskalationsPersonId=${event.eskalationsPersonId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungEskaliertEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
