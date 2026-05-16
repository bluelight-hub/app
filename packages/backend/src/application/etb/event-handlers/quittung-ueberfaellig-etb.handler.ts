/**
 * ETB-Eintrag Auto-Creation bei QuittungUeberfaellig (Issue 415).
 *
 * **System-Event:** Das Domain-Event liefert `userId === 'SYSTEM'` —
 * der Handler reicht den Sentinel-User unverändert an `AddEintragCommand`
 * weiter (Audit-Tools können `userId === 'SYSTEM'` für die Filterung
 * automatisierter Einträge nutzen).
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { resolveEinheitName } from './_shared/resolve-einheit-name';

const KATEGORIE: EtbKategorieValue = 'SYSTEM';

/**
 * Event Handler für automatischen ETB-Eintrag bei überfälliger PSA-Quittung
 * (System-getriebener Scheduler-Event, Issue 415).
 */
@Injectable()
export class QuittungUeberfaelligEtbHandler implements IEventHandler<QuittungUeberfaelligEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT) private readonly einheitRepo: IEinsatzEinheitRepository,
  ) {}

  async handle(event: QuittungUeberfaelligEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('QuittungUeberfaellig missing required fields', 'QuittungUeberfaelligEtbHandler');
        return;
      }

      const einheitName = await resolveEinheitName(this.einheitRepo, event.einheitId);
      const text = `PSA-Quittung überfällig (${event.ueberfaelligSeitMin} min) — Einheit ${einheitName}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'QuittungUeberfaellig',
          einheitId: event.einheitId,
          propagationGroupId: event.propagationGroupId,
          originalEventId: event.originalEventId,
          ueberfaelligSeitMin: event.ueberfaelligSeitMin,
          zuweisungId: event.zuweisungId,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'QuittungUeberfaelligEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'QuittungUeberfaelligEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in QuittungUeberfaelligEtbHandler: error=${msg}, stack=${stack}`, 'QuittungUeberfaelligEtbHandler');
    }
  }
}
