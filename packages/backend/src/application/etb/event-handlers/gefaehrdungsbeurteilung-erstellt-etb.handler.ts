/**
 * ETB-Eintrag Auto-Creation bei GefaehrdungsbeurteilungErstellt (Issue 415).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';

/**
 * Event Handler für automatischen ETB-Eintrag bei Erstellung einer
 * Gefährdungsbeurteilung (Issue 415).
 */
@Injectable()
export class GefaehrdungsbeurteilungErstelltEtbHandler implements IEventHandler<GefaehrdungsbeurteilungErstelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: GefaehrdungsbeurteilungErstelltEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('GefaehrdungsbeurteilungErstellt missing required fields', 'GefaehrdungsbeurteilungErstelltEtbHandler');
        return;
      }

      const text = `Gefährdungsbeurteilung angelegt (${event.itemCount} Items)`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'GefaehrdungsbeurteilungErstellt',
          gefaehrdungsbeurteilungId: event.gefaehrdungsbeurteilungId,
          einheitId: event.einheitId,
          vorlageId: event.vorlageId,
          itemCount: event.itemCount,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'GefaehrdungsbeurteilungErstelltEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'GefaehrdungsbeurteilungErstelltEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in GefaehrdungsbeurteilungErstelltEtbHandler: error=${msg}, stack=${stack}`, 'GefaehrdungsbeurteilungErstelltEtbHandler');
    }
  }
}
