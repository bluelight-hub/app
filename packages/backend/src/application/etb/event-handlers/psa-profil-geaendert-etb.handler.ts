/**
 * ETB-Eintrag Auto-Creation bei PsaProfilGeaendert (Issue 415).
 *
 * Polymorphes Event mit zwei Branches via `event.aktion`:
 * - `AKTIVIERT` — neue `PsaProfilZuweisung`-Row geöffnet.
 * - `DEAKTIVIERT` — bestehende Row geschlossen (`gueltigBis = now()`).
 *
 * Begründung wird auf 200 Zeichen getrunkt (Format: 197 + "...").
 *
 * Fire-and-Forget: Fehler werden geloggt aber NICHT propagiert.
 *
 * @module application/etb/event-handlers
 */
import type { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { AddEintragCommand, AddEintragHandler } from '@application/etb/commands';
import type { EtbKategorieValue } from '@domain/value-objects/etb-kategorie';

const KATEGORIE: EtbKategorieValue = 'MASSNAHME';
const BEGRUENDUNG_MAX_LENGTH = 200;

/**
 * Event Handler für automatischen ETB-Eintrag bei PSA-Profil-Toggle
 * (Aktivierung / Deaktivierung einer Einheit, Issue 415).
 */
@Injectable()
export class PsaProfilGeaendertEtbHandler implements IEventHandler<PsaProfilGeaendertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: PsaProfilGeaendertEvent): Promise<void> {
    try {
      if (!event.einsatzId || !event.userId) {
        this.logger.error('PsaProfilGeaendert missing required fields', 'PsaProfilGeaendertEtbHandler');
        return;
      }

      const verb = event.aktion === 'AKTIVIERT' ? 'aktiviert' : 'deaktiviert';
      const begruendung = event.begruendung.length > BEGRUENDUNG_MAX_LENGTH ? event.begruendung.slice(0, BEGRUENDUNG_MAX_LENGTH - 3) + '...' : event.begruendung;
      const text = `PSA-Profil ${event.profil} ${verb} für Einheit ${event.einheitId}: ${begruendung}`;

      const cmd = AddEintragCommand.create(
        event.einsatzId,
        text,
        event.userId,
        KATEGORIE,
        event.einsatzId,
        undefined,
        undefined,
        {
          eventType: 'PsaProfilGeaendert',
          zuweisungId: event.zuweisungId,
          propagationGroupId: event.propagationGroupId,
          profil: event.profil,
          aktion: event.aktion,
          einheitId: event.einheitId,
        },
        event.occurredAt,
      );

      if (cmd.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand: ${cmd.error}`, 'PsaProfilGeaendertEtbHandler');
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(cmd.value!);
      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry: ${result.error}`, 'PsaProfilGeaendertEtbHandler');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`CRITICAL: Unexpected error in PsaProfilGeaendertEtbHandler: error=${msg}, stack=${stack}`, 'PsaProfilGeaendertEtbHandler');
    }
  }
}
