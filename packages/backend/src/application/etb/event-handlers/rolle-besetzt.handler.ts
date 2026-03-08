/**
 * ETB-Eintrag Auto-Creation bei Rollenbesetzung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Rollenbesetzung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text:**
 * "{personVorname} {personNachname} übernimmt Rolle {rollenName}"
 *
 * @module application/etb/event-handlers
 * @see RolleBesetzt - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { RolleBesetzt } from '@domain/kraefte/events/rolle-besetzt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Rollenbesetzung.
 *
 * Verarbeitet RolleBesetzt Events und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Rollenbesetzung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Rollenbesetzung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class RolleBesetztEventHandler implements IEventHandler<RolleBesetzt> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet RolleBesetzt Event und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene RolleBesetzt Event (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: RolleBesetzt): Promise<void> {
    this.logger.log(`Creating ETB entry for RolleBesetzt: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}`, 'RolleBesetztEventHandler');

    try {
      // Validation: Snapshot-Daten sollten vorhanden sein
      if (!event.personVorname || !event.personNachname || !event.rollenName) {
        this.logger.warn(
          `RolleBesetzt event has missing snapshot data: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, vorname=${event.personVorname}, nachname=${event.personNachname}, rolle=${event.rollenName}`,
          'RolleBesetztEventHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // AC5/AC6: Text für ETB-Eintrag
      const text = `${event.personVorname} ${event.personNachname} übernimmt Rolle ${event.rollenName}`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, absender, empfaenger, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.besetztVon,
        'PERSONAL', // ETB Kategorie für Personaländerungen (Rollenbesetzung)
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'RolleBesetzt',
          einsatzPersonId: event.einsatzPersonId,
          rollenDefinitionId: event.rollenDefinitionId,
          rollenName: event.rollenName,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for RolleBesetzt: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'RolleBesetztEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for RolleBesetzt: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'RolleBesetztEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for RolleBesetzt: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}`, 'RolleBesetztEventHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for RolleBesetzt: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'RolleBesetztEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
