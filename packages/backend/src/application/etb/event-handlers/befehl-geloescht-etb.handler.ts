/**
 * ETB-Eintrag Auto-Creation bei Befehl-Soft-Delete (DSGVO).
 *
 * Erstellt einen ETB-Eintrag wenn anonymisierte Befehle nach der
 * Freigabeperiode soft-deleted werden.
 *
 * **Eintrag-Text (Story 5.5 AC3):**
 * "DSGVO: ${befehlCount} anonymisierte Befehle gelöscht"
 *
 * @module application/etb/event-handlers
 * @see BefehlGeloeschtEvent
 */
import type { BefehlGeloeschtEvent } from '@domain/events/befehl-geloescht.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const ETB_KATEGORIE_SYSTEM: EtbKategorieValue = 'SYSTEM';

@Injectable()
export class BefehlGeloeschtEtbHandler implements IEventHandler<BefehlGeloeschtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: BefehlGeloeschtEvent): Promise<void> {
    try {
      if (!event.einsatzId) {
        this.logger.error('BefehlGeloescht event has missing einsatzId', 'BefehlGeloeschtEtbHandler');
        return;
      }

      this.logger.log(`Creating ETB entry for BefehlGeloescht: einsatzId=${event.einsatzId.value}, count=${event.befehlCount}`, 'BefehlGeloeschtEtbHandler');

      const etbId = event.einsatzId.value;
      const text = `DSGVO: ${event.befehlCount} anonymisierte Befehle gelöscht`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_SYSTEM,
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'BefehlGeloescht',
          befehlCount: event.befehlCount,
        },
        event.occurredAt,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlGeloeschtEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlGeloeschtEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for BefehlGeloescht: einsatzId=${event.einsatzId.value}`, 'BefehlGeloeschtEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`CRITICAL: Unexpected error: ${errorMessage}`, 'BefehlGeloeschtEtbHandler');
    }
  }
}
