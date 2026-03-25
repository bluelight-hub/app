/**
 * ETB-Eintrag Auto-Creation bei Notiz-Aktualisierung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Notiz-Aktualisierung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 7.3):**
 * "Notiz '{titel}' aktualisiert"
 *
 * @module application/etb/event-handlers
 * @see NotizAktualisiertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { NotizAktualisiertEvent } from '@domain/notiz/events/notiz-aktualisiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * ETB Kategorie fuer Notiz-Aktualisierung (Story 7.3).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_NOTIZ: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Notiz-Aktualisierung.
 *
 * Verarbeitet NotizAktualisiertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Notiz-Aktualisierung (Story 7.3).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Notiz-Aktualisierung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class NotizAktualisiertEtbHandler implements IEventHandler<NotizAktualisiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet NotizAktualisiertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene NotizAktualisiertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: NotizAktualisiertEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for NotizAktualisiert: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}`, 'NotizAktualisiertEtbHandler');

    try {
      // Validierung aller required Fields
      if (!event.titel || !event.aktualisiertVon || !event.einsatzId || !event.notizId) {
        this.logger.error(
          `NotizAktualisiert event has missing required fields: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, aktualisiertVon=${event.aktualisiertVon}`,
          'NotizAktualisiertEtbHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // Story 7.3 + 7.7: Text fuer ETB-Eintrag (Team-Notiz Prefix bei istTeamsichtbar)
      const text = `${event.istTeamsichtbar ? 'Team-Notiz' : 'Notiz'} '${event.titel}' aktualisiert`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.aktualisiertVon,
        ETB_KATEGORIE_NOTIZ,
        event.einsatzId,
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'NotizAktualisiert',
          notizId: event.notizId.toString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for NotizAktualisiert: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'NotizAktualisiertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for NotizAktualisiert: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'NotizAktualisiertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for NotizAktualisiert: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}`, 'NotizAktualisiertEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for NotizAktualisiert: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'NotizAktualisiertEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
