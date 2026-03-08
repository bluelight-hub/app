/**
 * ETB-Eintrag Auto-Creation bei Einsatz-Rollenänderung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Rollenänderung
 * nicht zu blockieren.
 *
 * **Eintrag-Text (Story 5.4 AC4):**
 * - Neue Zuweisung: "Rolle zugewiesen: [UserName] als [neueRolle]"
 * - Aenderung: "Rolle geändert: [UserName] von [alteRolle] zu [neueRolle]"
 * - Entfernung: "Rolle entfernt: [UserName] war [alteRolle]"
 *
 * @module application/etb/event-handlers
 * @see RolleGeaendertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { RolleGeaendertEvent } from '@domain/events/rolle-geaendert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

/**
 * ETB Kategorie fuer Rollenänderungen (Story 5.4 AC4).
 * PERSONAL Kategorie, da es sich um Personaländerungen handelt.
 */
const ETB_KATEGORIE_PERSONAL: EtbKategorieValue = 'PERSONAL';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Einsatz-Rollenänderung.
 *
 * Verarbeitet RolleGeaendertEvent Events und erstellt automatisch einen ETB-Eintrag
 * fuer die Dokumentation der Rollenänderung (Story 5.4 AC4).
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Rollenänderung wird NICHT blockiert bei ETB-Fehlern
 */
@Injectable()
export class RolleGeaendertEtbHandler implements IEventHandler<RolleGeaendertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet RolleGeaendertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene RolleGeaendertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rueckgabe (Fire-and-Forget)
   */
  async handle(event: RolleGeaendertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId || !event.userName) {
        this.logger.error(`RolleGeaendert event has missing required fields: einsatzId=${event.einsatzId}, userId=${event.userId}`, 'RolleGeaendertEtbHandler');
        return;
      }

      this.logger.log(
        `Creating ETB entry for RolleGeaendert: einsatzId=${event.einsatzId}, userId=${event.userId}, alteRolle=${event.alteRolle}, neueRolle=${event.neueRolle}`,
        'RolleGeaendertEtbHandler',
      );

      const etbId = event.einsatzId;
      const text = this.buildEtbText(event);

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_PERSONAL,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'RolleGeaendert',
          userId: event.userId,
          alteRolle: event.alteRolle,
          neueRolle: event.neueRolle,
          aenderungDurch: event.aenderungDurch,
        },
        event.occurredAt,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'RolleGeaendertEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'RolleGeaendertEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for RolleGeaendert: userId=${event.userId}`, 'RolleGeaendertEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation: userId=${event?.userId ?? 'unknown'}, error=${errorMessage}, stack=${stack}`, 'RolleGeaendertEtbHandler');
    }
  }

  /**
   * Baut den ETB-Eintrag Text je nach Art der Rollenänderung.
   */
  private buildEtbText(event: RolleGeaendertEvent): string {
    if (!event.alteRolle && event.neueRolle) {
      return `Rolle zugewiesen: ${event.userName} als ${event.neueRolle} (durch ${event.aenderungDurchName})`;
    }
    if (event.alteRolle && !event.neueRolle) {
      return `Rolle entfernt: ${event.userName} war ${event.alteRolle} (durch ${event.aenderungDurchName})`;
    }
    return `Rolle geändert: ${event.userName} von ${event.alteRolle} zu ${event.neueRolle} (durch ${event.aenderungDurchName})`;
  }
}
