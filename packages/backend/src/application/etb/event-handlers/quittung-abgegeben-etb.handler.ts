/**
 * ETB-Eintrag Auto-Creation bei QuittungAbgegeben (Issue 415).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
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
 * Event Handler für automatischen ETB-Eintrag bei Abgabe einer PSA-Quittung
 * durch eine Einheit (Issue 415).
 */
@Injectable()
export class QuittungAbgegebenEtbHandler implements IEventHandler<QuittungAbgegebenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepo: IEinsatzEinheitRepository,
  ) {}

  async handle(event: QuittungAbgegebenEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('QuittungAbgegeben missing required fields', 'QuittungAbgegebenEtbHandler');
        return;
      }

      const einheitName = await resolveEinheitName(this.einheitRepo, event.einheitId);
      const text = `PSA-Quittung abgegeben durch Einheit ${einheitName}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'QuittungAbgegeben',
          propagationGroupId: event.propagationGroupId,
          einheitId: event.einheitId,
          quittiertAm: event.quittiertAm.toISOString(),
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'QuittungAbgegebenEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'QuittungAbgegebenEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in QuittungAbgegebenEtbHandler: error=${msg}, stack=${stack}`, 'QuittungAbgegebenEtbHandler');
    }
  }
}
