/**
 * ETB-Eintrag Auto-Creation bei SicherungspostenEingerichtet (Issue 415).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { SicherungspostenEingerichtetEvent } from '@domain/eigenschutz/events/sicherungsposten-eingerichtet.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';

/**
 * Event Handler für automatischen ETB-Eintrag bei neu eingerichtetem
 * Sicherungsposten (Issue 415).
 */
@Injectable()
export class SicherungspostenEingerichtetEtbHandler implements IEventHandler<SicherungspostenEingerichtetEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: SicherungspostenEingerichtetEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('SicherungspostenEingerichtet missing required fields', 'SicherungspostenEingerichtetEtbHandler');
        return;
      }

      const standortLabel = event.standortKind === 'coordinate' ? 'Koordinaten' : 'Adresse';
      const text = `Sicherungsposten "${event.bezeichnung}" eingerichtet (${event.personalCount} Personen, ${standortLabel})`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'SicherungspostenEingerichtet',
          sicherungspostenId: event.sicherungspostenId,
          bezeichnung: event.bezeichnung,
          standortKind: event.standortKind,
          personalCount: event.personalCount,
          einheitId: event.einheitId,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'SicherungspostenEingerichtetEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'SicherungspostenEingerichtetEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in SicherungspostenEingerichtetEtbHandler: error=${msg}, stack=${stack}`, 'SicherungspostenEingerichtetEtbHandler');
    }
  }
}
