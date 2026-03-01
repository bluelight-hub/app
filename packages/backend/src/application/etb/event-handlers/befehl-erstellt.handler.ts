/**
 * ETB-Eintrag Auto-Creation bei Befehl-Erstellung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Befehl-Erstellung
 * nicht zu blockieren. ETB-Eintraege koennen bei Bedarf manuell nacherstellt werden.
 *
 * **Eintrag-Text (Story 4.3):**
 * "Befehl #${nummer}: ${auftrag} an ${empfaenger.length} Empfänger"
 *
 * @module application/etb/event-handlers
 * @see BefehlErstelltEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
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
 * Event Handler fuer automatischen ETB-Eintrag bei Befehl-Erstellung.
 *
 * Verarbeitet BefehlErstelltEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Befehlserstellung (Story 4.3).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Befehl-Erstellung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events koennen zu multiplen Eintraegen fuehren (OK fuer ETB)
 */
@Injectable()
export class BefehlErstelltEtbHandler implements IEventHandler<BefehlErstelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet BefehlErstelltEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene BefehlErstelltEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: BefehlErstelltEvent): Promise<void> {
    try {
      // Validierung aller required Fields
      if (!event.befehlId || !event.einsatzId || !event.nummer || !event.empfaenger) {
        this.logger.error(`BefehlErstellt event has missing required fields: befehlId=${event.befehlId}, einsatzId=${event.einsatzId}`, 'BefehlErstelltEtbHandler');
        return; // Early exit - Event ist ungueltig
      }

      this.logger.log(`Creating ETB entry for BefehlErstellt: befehlId=${event.befehlId.value}, einsatzId=${event.einsatzId.value}, nummer=${event.nummer}`, 'BefehlErstelltEtbHandler');

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId.value;

      // Story 4.3: Text fuer ETB-Eintrag
      const text = `Befehl #${event.nummer}: ${event.auftrag} an ${event.empfaenger.length} Empfänger`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_BEFEHL,
        event.einsatzId.value,
        undefined, // absender - nicht relevant fuer automatische Eintraege
        undefined, // empfaenger - nicht relevant fuer automatische Eintraege
        {
          eventType: 'BefehlErstellt',
          befehlId: event.befehlId.value,
        },
        event.occurredAt,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlErstelltEtbHandler');
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausfuehren via injiziertem Handler
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlErstelltEtbHandler');
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for BefehlErstellt: befehlId=${event.befehlId.value}`, 'BefehlErstelltEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen fuer Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation: befehlId=${event?.befehlId?.value ?? 'unknown'}, error=${errorMessage}, stack=${stack}`, 'BefehlErstelltEtbHandler');
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
