/**
 * ETB-Eintrag Auto-Creation bei KonfliktErkannt (Issue 415, Story 3.9).
 *
 * Sicherheitsrelevante Audit-Spur für Sync-Konflikte auf kritischen Eigenschutz-
 * Feldern (PSA-Profil-Zuweisung, später Gefährdungsbeurteilung-Items). Fire-and-
 * Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * Kategorie `SYSTEM`, da es sich um einen vom System (Optimistic-Concurrency-
 * Control) erkannten technischen Konflikt handelt, der erst durch manuelle
 * Auflösung verschwindet.
 *
 * @module application/etb/event-handlers
 */
import type { KonfliktErkanntEvent } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler für automatischen ETB-Eintrag bei erkanntem Sync-Konflikt
 * (Issue 415, Story 3.9).
 */
@Injectable()
export class KonfliktErkanntEtbHandler implements IEventHandler<KonfliktErkanntEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: KonfliktErkanntEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('KonfliktErkannt missing required fields', 'KonfliktErkanntEtbHandler');
        return;
      }

      const text = `Sync-Konflikt erkannt: ${event.entityType}.${event.fieldPath} (server v${event.serverVersion}, lokal v${event.localExpectedVersion})`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'KonfliktErkannt',
          entityType: event.entityType,
          entityId: event.entityId,
          fieldPath: event.fieldPath,
          serverVersion: event.serverVersion,
          localExpectedVersion: event.localExpectedVersion,
          einheitId: event.einheitId ?? null,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'KonfliktErkanntEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'KonfliktErkanntEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in KonfliktErkanntEtbHandler: error=${msg}, stack=${stack}`, 'KonfliktErkanntEtbHandler');
    }
  }
}
