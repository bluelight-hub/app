/**
 * ETB-Eintrag Auto-Creation bei LueckeGemeldet (Issue 415).
 *
 * Meldung wird auf 200 Zeichen getrunkt (Format: 197 + "...").
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MATERIAL';
const MELDUNG_MAX_LENGTH = 200;

/**
 * Event Handler für automatischen ETB-Eintrag bei gemeldeter PSA-/Ausrüstungs-Lücke
 * einer Einheit (Issue 415).
 */
@Injectable()
export class LueckeGemeldetEtbHandler implements IEventHandler<LueckeGemeldetEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: LueckeGemeldetEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('LueckeGemeldet missing required fields', 'LueckeGemeldetEtbHandler');
        return;
      }

      const meldung = event.meldung.length > MELDUNG_MAX_LENGTH ? event.meldung.slice(0, MELDUNG_MAX_LENGTH - 3) + '...' : event.meldung;
      const text = `PSA-Lücke gemeldet von Einheit ${event.einheitId}: ${meldung}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'LueckeGemeldet',
          einheitId: event.einheitId,
          propagationGroupId: event.propagationGroupId,
          gemeldetAm: event.gemeldetAm.toISOString(),
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'LueckeGemeldetEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'LueckeGemeldetEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in LueckeGemeldetEtbHandler: error=${msg}, stack=${stack}`, 'LueckeGemeldetEtbHandler');
    }
  }
}
