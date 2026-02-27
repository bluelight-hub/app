/**
 * ETB-Eintrag Auto-Creation bei Befehl-Zustellung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um den Befehl-Workflow
 * nicht zu blockieren.
 *
 * **Eintrag-Text:**
 * "Befehl #${nummer}: Zugestellt an ${empfaengerName}"
 *
 * @module application/etb/event-handlers
 * @see BefehlZugestelltEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

/**
 * ETB Kategorie SYSTEM fuer Zustellungs-Events.
 * Zustellungen sind System-Events (automatisch getriggert).
 */
const ETB_KATEGORIE_SYSTEM: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Befehl-Zustellung.
 *
 * Verarbeitet BefehlZugestelltEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die per-Empfaenger Zustellungs-Dokumentation.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Befehl-Workflow wird NICHT blockiert bei ETB-Fehlern
 */
@Injectable()
export class BefehlZugestelltEtbHandler implements IEventHandler<BefehlZugestelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet BefehlZugestelltEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene BefehlZugestelltEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: BefehlZugestelltEvent): Promise<void> {
    try {
      if (!event.befehlId || !event.einsatzId || !event.nummer || !event.empfaengerName) {
        this.logger.error(`BefehlZugestellt event has missing required fields: befehlId=${event.befehlId}, einsatzId=${event.einsatzId}`, 'BefehlZugestelltEtbHandler');
        return;
      }

      this.logger.log(`Creating ETB entry for BefehlZugestellt: befehlId=${event.befehlId.value}, empfaengerName=${event.empfaengerName}`, 'BefehlZugestelltEtbHandler');

      const etbId = event.einsatzId.value;
      const text = `Befehl #${event.nummer}: Zugestellt an ${event.empfaengerName}`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_SYSTEM,
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'BefehlZugestellt',
          befehlId: event.befehlId.value,
          empfaengerId: event.empfaengerId,
          empfaengerName: event.empfaengerName,
        },
        event.zugestelltAm,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlZugestelltEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlZugestelltEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for BefehlZugestellt: befehlId=${event.befehlId.value}`, 'BefehlZugestelltEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation: befehlId=${event?.befehlId?.value ?? 'unknown'}, error=${errorMessage}, stack=${stack}`, 'BefehlZugestelltEtbHandler');
    }
  }
}
