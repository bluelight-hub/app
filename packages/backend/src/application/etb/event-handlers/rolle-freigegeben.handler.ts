/**
 * ETB-Eintrag Auto-Creation bei Rollenfreigabe.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Rollenfreigabe
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text:**
 * "{personVorname} {personNachname} gibt Rolle {rollenName} ab"
 *
 * @module application/etb/event-handlers
 * @see RolleFreigegeben - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
// biome-ignore lint/style/useImportType: AddEintragHandler needed for DI at runtime
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';

/**
 * Event Handler für automatischen ETB-Eintrag bei Rollenfreigabe.
 *
 * Verarbeitet RolleFreigegeben Events und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Rollenfreigabe.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Rollenfreigabe wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class RolleFreigegebenEventHandler implements IEventHandler<RolleFreigegeben> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet RolleFreigegeben Event und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene RolleFreigegeben Event (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: RolleFreigegeben): Promise<void> {
    this.logger.log(`Creating ETB entry for RolleFreigegeben: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}`, 'RolleFreigegebenEventHandler');

    try {
      // Validation: Snapshot-Daten sollten vorhanden sein
      if (!event.personVorname || !event.personNachname || !event.rollenName) {
        this.logger.warn(
          `RolleFreigegeben event has missing snapshot data: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, vorname=${event.personVorname}, nachname=${event.personNachname}, rolle=${event.rollenName}`,
          'RolleFreigegebenEventHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // AC5/AC6: Text für ETB-Eintrag
      const text = `${event.personVorname} ${event.personNachname} gibt Rolle ${event.rollenName} ab`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.freigegebenVon,
        'PERSONAL', // ETB Kategorie für Personaländerungen (Rollenfreigabe)
        event.einsatzId,
        {
          eventType: 'RolleFreigegeben',
          einsatzPersonId: event.einsatzPersonId,
          rollenDefinitionId: event.rollenDefinitionId,
          rollenName: event.rollenName,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for RolleFreigegeben: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'RolleFreigegebenEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for RolleFreigegeben: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'RolleFreigegebenEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for RolleFreigegeben: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}`, 'RolleFreigegebenEventHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for RolleFreigegeben: einsatzId=${event.einsatzId}, personId=${event.einsatzPersonId}, rolle=${event.rollenName}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'RolleFreigegebenEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
