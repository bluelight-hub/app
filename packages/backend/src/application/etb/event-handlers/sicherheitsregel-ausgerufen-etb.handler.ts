/**
 * ETB-Eintrag Auto-Creation bei SicherheitsregelAusgerufen (Issue 415).
 *
 * Polymorphes Event mit drei Branches via `changedFields`:
 * - `created: true` — initiale Bekanntgabe der Regel (Version 1).
 * - `updated: [...]` — Felder geändert (Version N → N+1).
 * - `deprecated: true` — logische Abkündigung im Re-Wire-Pfad.
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';

/**
 * Event Handler für automatischen ETB-Eintrag bei Sicherheitsregel-Lifecycle
 * (Ausrufen / Aktualisieren / Abkündigen, Issue 415).
 */
@Injectable()
export class SicherheitsregelAusgerufenEtbHandler implements IEventHandler<SicherheitsregelAusgerufenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: SicherheitsregelAusgerufenEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('SicherheitsregelAusgerufen missing required fields', 'SicherheitsregelAusgerufenEtbHandler');
        return;
      }

      const titel = event.titel;
      const cf = event.changedFields;
      let text: string;
      if (cf.created) {
        text = `Sicherheitsregel "${titel}" ausgerufen`;
      } else if (cf.deprecated) {
        text = `Sicherheitsregel "${titel}" abgekündigt`;
      } else if (cf.updated && cf.updated.length > 0) {
        text = `Sicherheitsregel "${titel}" aktualisiert (v${event.fromVersion}→v${event.toVersion}, Felder: ${cf.updated.join(', ')})`;
      } else {
        // Defensiv — Event ohne erkennbaren Modus.
        text = `Sicherheitsregel "${titel}" geändert (v${event.fromVersion}→v${event.toVersion})`;
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
          eventType: 'SicherheitsregelAusgerufen',
          regelId: event.regelId,
          propagationGroupId: event.propagationGroupId,
          einheitId: event.einheitId,
          fromVersion: event.fromVersion,
          toVersion: event.toVersion,
          changedFields: event.changedFields,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'SicherheitsregelAusgerufenEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'SicherheitsregelAusgerufenEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in SicherheitsregelAusgerufenEtbHandler: error=${msg}, stack=${stack}`, 'SicherheitsregelAusgerufenEtbHandler');
    }
  }
}
