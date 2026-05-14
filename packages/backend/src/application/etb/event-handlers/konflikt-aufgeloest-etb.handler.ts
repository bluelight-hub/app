/**
 * ETB-Eintrag Auto-Creation bei KonfliktAufgeloest (Issue 415, Story 3.10).
 *
 * Audit-Spur für die manuelle Auflösung eines Sync-Konflikts (SERVER_WINS /
 * LOCAL_WINS / MERGED). Fire-and-Forget: Fehler werden geloggt aber NICHT
 * propagiert.
 *
 * Kategorie `DOKUMENTATION`, da die Auflösung eine bewusste, dokumentations-
 * pflichtige Entscheidung des Sicherheitsbeauftragten ist.
 *
 * @module application/etb/event-handlers
 */
import type { KonfliktAufgeloestEvent } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'DOKUMENTATION';

/**
 * Event Handler für automatischen ETB-Eintrag bei aufgelöstem Sync-Konflikt
 * (Issue 415, Story 3.10).
 */
@Injectable()
export class KonfliktAufgeloestEtbHandler implements IEventHandler<KonfliktAufgeloestEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: KonfliktAufgeloestEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('KonfliktAufgeloest missing required fields', 'KonfliktAufgeloestEtbHandler');
        return;
      }

      const text = `Sync-Konflikt aufgelöst: ${event.resolution} (${event.entityType}.${event.fieldPath})`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'KonfliktAufgeloest',
          syncConflictId: event.syncConflictId,
          entityType: event.entityType,
          entityId: event.entityId,
          fieldPath: event.fieldPath,
          resolution: event.resolution,
          resolvedAt: event.resolvedAt.toISOString(),
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'KonfliktAufgeloestEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'KonfliktAufgeloestEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in KonfliktAufgeloestEtbHandler: error=${msg}, stack=${stack}`, 'KonfliktAufgeloestEtbHandler');
    }
  }
}
