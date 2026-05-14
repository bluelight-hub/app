/**
 * ETB-Eintrag Auto-Creation bei GefaehrdungsbeurteilungAktualisiert (Issue 415).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';

/**
 * Event Handler für automatischen ETB-Eintrag bei Aktualisierung einer
 * Gefährdungsbeurteilung (Items-Update, Issue 415).
 */
@Injectable()
export class GefaehrdungsbeurteilungAktualisiertEtbHandler implements IEventHandler<GefaehrdungsbeurteilungAktualisiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: GefaehrdungsbeurteilungAktualisiertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('GefaehrdungsbeurteilungAktualisiert missing required fields', 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
        return;
      }

      const cf = event.changedFields;
      const text = `Gefährdungsbeurteilung aktualisiert (v${event.fromVersion}→v${event.toVersion}): ${cf.added.length} neu, ${cf.updated.length} geändert, ${cf.removed.length} entfernt`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'GefaehrdungsbeurteilungAktualisiert',
          gefaehrdungsbeurteilungId: event.gefaehrdungsbeurteilungId,
          einheitId: event.einheitId,
          fromVersion: event.fromVersion,
          toVersion: event.toVersion,
          added: cf.added.length,
          updated: cf.updated.length,
          removed: cf.removed.length,
          unchanged: cf.unchanged,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in GefaehrdungsbeurteilungAktualisiertEtbHandler: error=${msg}, stack=${stack}`, 'GefaehrdungsbeurteilungAktualisiertEtbHandler');
    }
  }
}
