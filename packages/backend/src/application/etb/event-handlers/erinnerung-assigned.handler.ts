/**
 * ETB-Eintrag Auto-Creation bei Erinnerung-Zuweisung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Erinnerung-Zuweisung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 5.1 AC2):**
 * "Erinnerung '{titel}' zugewiesen an {person}"
 *
 * @module application/etb/event-handlers
 * @see ErinnerungAssignedEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { ErinnerungAssignedEvent } from '@domain/events/erinnerung-assigned.event';
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
 * Event Handler fuer automatischen ETB-Eintrag bei Erinnerung-Zuweisung.
 *
 * Verarbeitet ErinnerungAssignedEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Erinnerungszuweisung (Story 5.1 AC2).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Erinnerung-Zuweisung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class ErinnerungAssignedEventHandler implements IEventHandler<ErinnerungAssignedEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet ErinnerungAssignedEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene ErinnerungAssignedEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: ErinnerungAssignedEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for ErinnerungAssigned: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, assignedToId=${event.assignedToId}`,
      'ErinnerungAssignedEventHandler',
    );

    try {
      // Validierung aller required Fields (inkl. assignedToId fuer .toString() Call)
      if (!event.titel || !event.assignedById || !event.assignedToId || !event.erinnerungId || !event.einsatzId) {
        this.logger.error(
          `ErinnerungAssigned event has missing required fields: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, assignedBy=${event.assignedById}, assignedToId=${event.assignedToId}`,
          'ErinnerungAssignedEventHandler',
        );
        return; // Early exit - Event ist ungueltig
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.toString();

      // Story 5.1 AC2: Text fuer ETB-Eintrag aus Template
      // Note: Wir verwenden die UserId als Identifier - ein User-Lookup wuerde zusaetzliche DB-Abfrage erfordern
      const text = ERINNERUNG_ETB_TEMPLATES.ASSIGNED.replace('{titel}', event.titel).replace('{person}', event.assignedToId.toString());

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.assignedById.toString(),
        ETB_KATEGORIE_ERINNERUNG,
        event.einsatzId.toString(),
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'ErinnerungAssigned',
          erinnerungId: event.erinnerungId.toString(),
          assignedToId: event.assignedToId.toString(),
          assignedById: event.assignedById.toString(),
          assignedAt: event.assignedAt.toISOString(),
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for ErinnerungAssigned: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'ErinnerungAssignedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for ErinnerungAssigned: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'ErinnerungAssignedEventHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for ErinnerungAssigned: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, assignedToId=${event.assignedToId}`,
        'ErinnerungAssignedEventHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for ErinnerungAssigned: einsatzId=${event.einsatzId}, erinnerungId=${event.erinnerungId}, assignedToId=${event.assignedToId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'ErinnerungAssignedEventHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
