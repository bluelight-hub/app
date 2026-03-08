/**
 * ETB-Eintrag Auto-Creation bei Fuehrungsrhythmus-Aktivierung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Fuehrungsrhythmus-Aktivierung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 6.7):**
 * "Fuehrungsrhythmus '{templateName}' aktiviert ({anzahl} Erinnerungen)"
 *
 * @module application/etb/event-handlers
 * @see FuehrungsrhythmusAktiviertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { FuehrungsrhythmusAktiviertEvent } from '@domain/fuehrungsrhythmus/events/fuehrungsrhythmus-aktiviert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * ETB Kategorie fuer Fuehrungsrhythmus-Aktivierung (Story 6.7).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_ERINNERUNG: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Fuehrungsrhythmus-Aktivierung.
 *
 * Verarbeitet FuehrungsrhythmusAktiviertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Aktivierung (Story 6.7).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Fuehrungsrhythmus-Aktivierung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class FuehrungsrhythmusAktiviertEtbHandler implements IEventHandler<FuehrungsrhythmusAktiviertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet FuehrungsrhythmusAktiviertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene FuehrungsrhythmusAktiviertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: FuehrungsrhythmusAktiviertEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for FuehrungsrhythmusAktiviert: einsatzId=${event.einsatzId}, templateId=${event.templateId}, templateName=${event.templateName}`,
      'FuehrungsrhythmusAktiviertEtbHandler',
    );

    try {
      // Validierung aller required Fields
      if (!event.templateName || !event.aktiviertVon || !event.einsatzId || !event.templateId) {
        this.logger.error(
          `FuehrungsrhythmusAktiviert event has missing required fields: einsatzId=${event.einsatzId}, templateId=${event.templateId}, templateName=${event.templateName}, aktiviertVon=${event.aktiviertVon}`,
          'FuehrungsrhythmusAktiviertEtbHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 6.7: Text fuer ETB-Eintrag
      const text = `Führungsrhythmus '${event.templateName}' aktiviert (${event.erstellteErinnerungIds.length} Erinnerungen)`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.aktiviertVon.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'FuehrungsrhythmusAktiviert',
          templateId: event.templateId.toString(),
          templateName: event.templateName,
          erstellteErinnerungIds: event.erstellteErinnerungIds.map((id) => id.toString()),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for FuehrungsrhythmusAktiviert: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'FuehrungsrhythmusAktiviertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for FuehrungsrhythmusAktiviert: einsatzId=${event.einsatzId}, templateId=${event.templateId}, templateName=${event.templateName}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'FuehrungsrhythmusAktiviertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for FuehrungsrhythmusAktiviert: einsatzId=${event.einsatzId}, templateId=${event.templateId}, templateName=${event.templateName}`,
        'FuehrungsrhythmusAktiviertEtbHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for FuehrungsrhythmusAktiviert: einsatzId=${event.einsatzId}, templateId=${event.templateId}, templateName=${event.templateName}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'FuehrungsrhythmusAktiviertEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
