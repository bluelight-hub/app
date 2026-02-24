/**
 * ETB-Eintrag Auto-Creation bei Befehl-Anonymisierung (DSGVO).
 *
 * Erstellt einen ETB-Eintrag wenn Befehle eines Einsatzes
 * DSGVO-konform anonymisiert werden.
 *
 * **Eintrag-Text (Story 5.5 AC2):**
 * "DSGVO: ${befehlCount} Befehle anonymisiert (${empfaengerCount} Empfänger, ${kommentarCount} Kommentare)"
 *
 * @module application/etb/event-handlers
 * @see BefehlAnonymisiertEvent
 */
import type { BefehlAnonymisiertEvent } from '@domain/events/befehl-anonymisiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const ETB_KATEGORIE_SYSTEM: EtbKategorieValue = 'SYSTEM';

@Injectable()
export class BefehlAnonymisiertEtbHandler implements IEventHandler<BefehlAnonymisiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: BefehlAnonymisiertEvent): Promise<void> {
    try {
      if (!event.einsatzId) {
        this.logger.error('BefehlAnonymisiert event has missing einsatzId', 'BefehlAnonymisiertEtbHandler');
        return;
      }

      this.logger.log(`Creating ETB entry for BefehlAnonymisiert: einsatzId=${event.einsatzId.value}, count=${event.befehlCount}`, 'BefehlAnonymisiertEtbHandler');

      const etbId = event.einsatzId.value;
      const text = `DSGVO: ${event.befehlCount} Befehle anonymisiert (${event.empfaengerCount} Empfänger, ${event.kommentarCount} Kommentare)`;

      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        'system',
        ETB_KATEGORIE_SYSTEM,
        event.einsatzId.value,
        undefined,
        undefined,
        {
          eventType: 'BefehlAnonymisiert',
          befehlCount: event.befehlCount,
          empfaengerCount: event.empfaengerCount,
          kommentarCount: event.kommentarCount,
        },
        event.occurredAt,
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: error=${commandResult.error}`, 'BefehlAnonymisiertEtbHandler');
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: error=${result.error}`, 'BefehlAnonymisiertEtbHandler');
        return;
      }

      this.logger.log(`ETB entry created for BefehlAnonymisiert: einsatzId=${event.einsatzId.value}`, 'BefehlAnonymisiertEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`CRITICAL: Unexpected error: ${errorMessage}`, 'BefehlAnonymisiertEtbHandler');
    }
  }
}
