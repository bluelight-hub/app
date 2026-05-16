/**
 * ETB-Eintrag Auto-Creation bei SicherheitsregelQuittiert (Issue 415).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { resolveEinheitName } from './_shared/resolve-einheit-name';

const KATEGORIE: EtbKategorieValue = 'DOKUMENTATION';

/**
 * Event Handler für automatischen ETB-Eintrag bei Quittierung einer
 * Sicherheitsregel durch eine Einheit (Issue 415).
 */
@Injectable()
export class SicherheitsregelQuittiertEtbHandler implements IEventHandler<SicherheitsregelQuittiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepo: IEinsatzEinheitRepository,
  ) {}

  async handle(event: SicherheitsregelQuittiertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('SicherheitsregelQuittiert missing required fields', 'SicherheitsregelQuittiertEtbHandler');
        return;
      }

      const einheitName = await resolveEinheitName(this.einheitRepo, event.einheitId);
      const text = `Sicherheitsregel quittiert durch Einheit ${einheitName}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'SicherheitsregelQuittiert',
          regelId: event.regelId,
          einheitId: event.einheitId,
          propagationGroupId: event.propagationGroupId,
          quittiertAm: event.quittiertAm.toISOString(),
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'SicherheitsregelQuittiertEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'SicherheitsregelQuittiertEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in SicherheitsregelQuittiertEtbHandler: error=${msg}, stack=${stack}`, 'SicherheitsregelQuittiertEtbHandler');
    }
  }
}
