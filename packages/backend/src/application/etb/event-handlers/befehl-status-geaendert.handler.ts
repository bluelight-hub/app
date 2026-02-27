/**
 * ETB-Eintrag Auto-Creation bei Befehl-Status-Aenderung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um den Befehl-Workflow
 * nicht zu blockieren.
 *
 * **Eintrag-Text:**
 * "Befehl #${nummer}: Status geändert von ${alterStatus} auf ${neuerStatus}"
 *
 * @module application/etb/event-handlers
 * @see BefehlStatusGeaendertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

/**
 * ETB Kategorie SYSTEM fuer Status-Aenderungen.
 * Status-Aenderungen sind System-Events (automatisch getriggert).
 */
const ETB_KATEGORIE_SYSTEM: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Befehl-Status-Aenderung.
 *
 * Verarbeitet BefehlStatusGeaendertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation von Status-Uebergaengen (ERTEILT→ZUGESTELLT, ZUGESTELLT→QUITTIERT, *→KORRIGIERT).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Befehl-Workflow wird NICHT blockiert bei ETB-Fehlern
 */
@Injectable()
export class BefehlStatusGeaendertEtbHandler implements IEventHandler<BefehlStatusGeaendertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet BefehlStatusGeaendertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene BefehlStatusGeaendertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: BefehlStatusGeaendertEvent): Promise<void> {
    try {
      if (!event.befehlId || !event.einsatzId || !event.nummer || !event.oldStatus || !event.newStatus) {
        this.logger.error(`BefehlStatusGeaendert event has missing required fields: befehlId=${event.befehlId}, einsatzId=${event.einsatzId}`, 'BefehlStatusGeaendertEtbHandler');
        return;
      }

      this.logger.log(`Creating ETB entry for BefehlStatusGeaendert: befehlId=${event.befehlId.value}, ${event.oldStatus.value} -> ${event.newStatus.value}`, 'BefehlStatusGeaendertEtbHandler');

      const etbId = event.einsatzId.value;
      const text = `Befehl #${event.nummer}: Status geändert von ${event.oldStatus.value} auf ${event.newStatus.value}`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_SYSTEM,
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'BefehlStatusGeaendert',
          befehlId: event.befehlId.value,
          oldStatus: event.oldStatus.value,
          newStatus: event.newStatus.value,
        },
        event.occurredAt,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlStatusGeaendertEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlStatusGeaendertEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for BefehlStatusGeaendert: befehlId=${event.befehlId.value}`, 'BefehlStatusGeaendertEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation: befehlId=${event?.befehlId?.value ?? 'unknown'}, error=${errorMessage}, stack=${stack}`,
        'BefehlStatusGeaendertEtbHandler',
      );
    }
  }
}
