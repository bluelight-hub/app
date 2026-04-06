/**
 * ETB-Eintrag bei Gefahrenmatrix-Aktualisierung.
 *
 * Fire-and-Forget Pattern: Fehler werden geloggt, nicht propagiert.
 *
 * **Eintrag-Text:**
 * - Aktualisierung: "Gefahrenbewertung: {Typ} → {Objekt} auf {Stufe} gesetzt"
 * - Entfernung: "Gefahrenbewertung {Typ}/{Objekt} aufgehoben"
 *
 * @module application/etb/event-handlers
 * @see GefahrenmatrixAktualisiertEvent
 * @see AddEintragHandler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { GefahrenmatrixAktualisiertEvent } from '@domain/gefahr/events/gefahrenmatrix-aktualisiert.event';
import { GEFAHRENTYP_LABEL } from '@domain/gefahr/value-objects/gefahrentyp';
import { SCHUTZOBJEKT_LABEL } from '@domain/gefahr/value-objects/schutzobjekt';
import { Warnstufe, WARNSTUFE_LABEL } from '@domain/gefahr/value-objects/warnstufe';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

@Injectable()
export class GefahrenmatrixAktualisiertEtbHandler implements IEventHandler<GefahrenmatrixAktualisiertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: GefahrenmatrixAktualisiertEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for GefahrenmatrixAktualisiert: einsatzId=${event.einsatzId}, typ=${event.gefahrentyp}, objekt=${event.schutzobjekt}, stufe=${event.warnstufe}`,
      'GefahrenmatrixAktualisiertEtbHandler',
    );

    try {
      const etbId = event.einsatzId;

      const typLabel = GEFAHRENTYP_LABEL[event.gefahrentyp as keyof typeof GEFAHRENTYP_LABEL] ?? event.gefahrentyp;
      const objektLabel = SCHUTZOBJEKT_LABEL[event.schutzobjekt as keyof typeof SCHUTZOBJEKT_LABEL] ?? event.schutzobjekt;
      const stufeLabel = WARNSTUFE_LABEL[event.warnstufe as keyof typeof WARNSTUFE_LABEL] ?? event.warnstufe;

      const text = event.warnstufe === Warnstufe.KEINE ? `Gefahrenbewertung ${typLabel}/${objektLabel} aufgehoben` : `Gefahrenbewertung: ${typLabel} → ${objektLabel} auf ${stufeLabel} gesetzt`;

      const commandResult = AddEintragCommand.create(etbId, text, event.aktualisiertVon, 'ERKUNDUNG', event.einsatzId, undefined, undefined, {
        eventType: 'GefahrenmatrixAktualisiert',
        gefahrentyp: event.gefahrentyp,
        schutzobjekt: event.schutzobjekt,
        warnstufe: event.warnstufe,
      });

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for GefahrenmatrixAktualisiert: einsatzId=${event.einsatzId}, typ=${event.gefahrentyp}, objekt=${event.schutzobjekt}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'GefahrenmatrixAktualisiertEtbHandler',
        );
        return;
      }

      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for GefahrenmatrixAktualisiert: einsatzId=${event.einsatzId}, typ=${event.gefahrentyp}, objekt=${event.schutzobjekt}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'GefahrenmatrixAktualisiertEtbHandler',
        );
        return;
      }

      this.logger.log(
        `ETB entry created for GefahrenmatrixAktualisiert: einsatzId=${event.einsatzId}, typ=${event.gefahrentyp}, objekt=${event.schutzobjekt}, stufe=${event.warnstufe}`,
        'GefahrenmatrixAktualisiertEtbHandler',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for GefahrenmatrixAktualisiert: einsatzId=${event.einsatzId}, typ=${event.gefahrentyp}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'GefahrenmatrixAktualisiertEtbHandler',
      );
    }
  }
}
