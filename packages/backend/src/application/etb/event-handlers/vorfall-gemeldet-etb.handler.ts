/**
 * ETB-Eintrag Auto-Creation bei VorfallGemeldet (Issue 415, Story 5.1).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * Kategorie `SONSTIGES`, da Vorfall-Meldungen breit gestreute Sachverhalte
 * abdecken (Beinaheunfälle, Verletzungen, technische Probleme) und nicht
 * trennscharf zu MASSNAHME oder DOKUMENTATION passen. Bei `unfallkasseRelevant`
 * wird der Text-Suffix `' (unfallkasse-relevant)'` angehängt, damit der ETB
 * direkt signalisiert, dass eine externe Meldepflicht greift.
 *
 * @module application/etb/event-handlers
 */
import type { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'SONSTIGES';

/**
 * Event Handler für automatischen ETB-Eintrag bei gemeldetem Vorfall
 * (Issue 415, Story 5.1).
 */
@Injectable()
export class VorfallGemeldetEtbHandler implements IEventHandler<VorfallGemeldetEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: VorfallGemeldetEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('VorfallGemeldet missing required fields', 'VorfallGemeldetEtbHandler');
        return;
      }

      const suffix = event.unfallkasseRelevant ? ' (unfallkasse-relevant)' : '';
      const text = `Vorfall gemeldet von Einheit ${event.einheitId}${suffix} — Zeitpunkt: ${event.vorfallZeit.toISOString()}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'VorfallGemeldet',
          vorfallId: event.vorfallId,
          einheitId: event.einheitId,
          vorfallZeit: event.vorfallZeit.toISOString(),
          unfallkasseRelevant: event.unfallkasseRelevant,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'VorfallGemeldetEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'VorfallGemeldetEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in VorfallGemeldetEtbHandler: error=${msg}, stack=${stack}`, 'VorfallGemeldetEtbHandler');
    }
  }
}
