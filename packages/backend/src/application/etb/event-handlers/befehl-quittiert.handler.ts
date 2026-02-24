/**
 * ETB-Eintrag Auto-Creation bei Befehl-Quittierung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Befehl-Quittierung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 4.3):**
 * "Befehl #{nummer} quittiert als {quittierungArt} von Empfänger"
 *
 * @module application/etb/event-handlers
 * @see BefehlQuittiertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

/**
 * ETB Kategorie fuer Befehle (Story 4.3).
 * Als Konstante definiert fuer bessere Wartbarkeit und Type-Safety.
 */
const ETB_KATEGORIE_BEFEHL: EtbKategorieValue = 'BEFEHL';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Befehl-Quittierung.
 *
 * Verarbeitet BefehlQuittiertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Befehl-Quittierung (Story 4.3).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Befehl-Quittierung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class BefehlQuittiertEtbHandler implements IEventHandler<BefehlQuittiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet BefehlQuittiertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene BefehlQuittiertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: BefehlQuittiertEvent): Promise<void> {
    try {
      if (!event.befehlId || !event.einsatzId || !event.nummer || !event.empfaengerId) {
        this.logger.error(
          `BefehlQuittiert event has missing required fields: befehlId=${event.befehlId}, einsatzId=${event.einsatzId}, empfaengerId=${event.empfaengerId}`,
          'BefehlQuittiertEtbHandler',
        );
        return;
      }

      this.logger.log(`Creating ETB entry for BefehlQuittiert: befehlId=${event.befehlId.value}, einsatzId=${event.einsatzId.value}, nummer=${event.nummer}`, 'BefehlQuittiertEtbHandler');

      const etbId = event.einsatzId.value;
      const text = `Befehl #${event.nummer} quittiert als ${event.quittierungArt} von Empfänger`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_BEFEHL,
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'BefehlQuittiert',
          befehlId: event.befehlId.value,
          empfaengerId: event.empfaengerId.value,
          quittierungArt: event.quittierungArt,
        },
        event.quittiertAm,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlQuittiertEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlQuittiertEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for BefehlQuittiert: befehlId=${event.befehlId.value}`, 'BefehlQuittiertEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation: befehlId=${event?.befehlId?.value ?? 'unknown'}, error=${errorMessage}, stack=${stack}`, 'BefehlQuittiertEtbHandler');
    }
  }
}
