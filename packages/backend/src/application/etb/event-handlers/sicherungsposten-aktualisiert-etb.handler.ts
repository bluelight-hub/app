/**
 * ETB-Eintrag Auto-Creation bei SicherungspostenAktualisiert (Issue 415).
 *
 * Polymorphes Event mit zwei Branches via `event.changedFields.aufgeloest`:
 * - `aufgeloest === true` — Sicherungsposten wurde aufgelöst.
 * - Sonst — reguläres Update mit Liste der geänderten Felder.
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { SicherungspostenAktualisiertEvent } from '@domain/eigenschutz/events/sicherungsposten-aktualisiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';

/**
 * Event Handler für automatischen ETB-Eintrag bei Sicherungsposten-Update
 * oder -Auflösung (Issue 415).
 */
@Injectable()
export class SicherungspostenAktualisiertEtbHandler implements IEventHandler<SicherungspostenAktualisiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: SicherungspostenAktualisiertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('SicherungspostenAktualisiert missing required fields', 'SicherungspostenAktualisiertEtbHandler');
        return;
      }

      const cf = event.changedFields;
      let text: string;
      if (cf.aufgeloest) {
        text = `Sicherungsposten aufgelöst (v${event.fromVersion}→v${event.toVersion})`;
      } else {
        text = `Sicherungsposten aktualisiert (v${event.fromVersion}→v${event.toVersion}, Felder: ${cf.changed.join(', ')})`;
      }

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'SicherungspostenAktualisiert',
          sicherungspostenId: event.sicherungspostenId,
          fromVersion: event.fromVersion,
          toVersion: event.toVersion,
          changedFields: cf,
          einheitId: event.einheitId,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'SicherungspostenAktualisiertEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'SicherungspostenAktualisiertEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in SicherungspostenAktualisiertEtbHandler: error=${msg}, stack=${stack}`, 'SicherungspostenAktualisiertEtbHandler');
    }
  }
}
