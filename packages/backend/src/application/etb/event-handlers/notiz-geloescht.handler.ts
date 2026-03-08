/**
 * ETB-Eintrag Auto-Creation bei Notiz-Loeschung (Story 7.4).
 *
 * Fire-and-Forget Pattern: Fehler werden geloggt aber NICHT propagiert.
 *
 * **Eintrag-Text:** "Notiz '{titel}' geloescht"
 *
 * @module application/etb/event-handlers
 * @see NotizGeloeschtEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import type { NotizGeloeschtEvent } from '@domain/notiz/events/notiz-geloescht.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

const ETB_KATEGORIE_NOTIZ: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler fuer automatischen ETB-Eintrag bei Notiz-Loeschung (Story 7.4).
 */
@Injectable()
export class NotizGeloeschtEtbHandler implements IEventHandler<NotizGeloeschtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: NotizGeloeschtEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for NotizGeloescht: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}`, 'NotizGeloeschtEtbHandler');

    try {
      if (!event.titel || !event.geloeschtVon || !event.einsatzId || !event.notizId) {
        this.logger.error(
          `NotizGeloescht event has missing required fields: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, geloeschtVon=${event.geloeschtVon}`,
          'NotizGeloeschtEtbHandler',
        );
        return;
      }

      const etbId = event.einsatzId;
      const text = `Notiz '${event.titel}' gelöscht`;

      const commandResult = AddEintragCommand.create(etbId, text, event.geloeschtVon.toString(), ETB_KATEGORIE_NOTIZ, event.einsatzId, undefined, undefined, {
        eventType: 'NotizGeloescht',
        notizId: event.notizId.toString(),
      });

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for NotizGeloescht: einsatzId=${event.einsatzId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'NotizGeloeschtEtbHandler',
        );
        return;
      }

      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for NotizGeloescht: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'NotizGeloeschtEtbHandler',
        );
        return;
      }

      this.logger.log(`ETB entry created for NotizGeloescht: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}`, 'NotizGeloeschtEtbHandler');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for NotizGeloescht: einsatzId=${event.einsatzId}, notizId=${event.notizId}, titel=${event.titel}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'NotizGeloeschtEtbHandler',
      );
    }
  }
}
