/**
 * ETB-Eintrag Auto-Creation bei VorfallExportiert (Issue 415, Story 5.6).
 *
 * Audit-Spur für Vorfall-Exporte (PDF / JSON). Fire-and-Forget: Fehler
 * werden geloggt aber NICHT propagiert.
 *
 * Kategorie `DOKUMENTATION`, da das Event den Download eines bereits
 * dokumentierten Vorfalls protokolliert.
 *
 * @module application/etb/event-handlers
 */
import type { VorfallExportiertEvent } from '@domain/eigenschutz/events/vorfall-exportiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'DOKUMENTATION';

/**
 * Event Handler für automatischen ETB-Eintrag bei Vorfall-Export
 * (Issue 415, Story 5.6).
 */
@Injectable()
export class VorfallExportiertEtbHandler implements IEventHandler<VorfallExportiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: VorfallExportiertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('VorfallExportiert missing required fields', 'VorfallExportiertEtbHandler');
        return;
      }

      const text = `Vorfall exportiert als ${event.format.toUpperCase()}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'VorfallExportiert',
          vorfallId: event.vorfallId,
          format: event.format,
          downloadedAt: event.downloadedAt.toISOString(),
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'VorfallExportiertEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'VorfallExportiertEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in VorfallExportiertEtbHandler: error=${msg}, stack=${stack}`, 'VorfallExportiertEtbHandler');
    }
  }
}
