/**
 * ETB-Eintrag Auto-Creation bei Einheit-Statusänderung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Statusänderung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * "Einheit {name}: Status geändert von {alt} auf {neu}"
 *
 * @module application/etb/event-handlers
 * @see EinheitStatusGeaendertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { EinheitStatusGeaendertEvent } from '@domain/kraefte/events/einheit-status-geaendert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Einheit-Statusänderung.
 *
 * Verarbeitet EinheitStatusGeaendertEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Statusänderung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Statusänderung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class EinheitStatusGeaendertEtbHandler implements IEventHandler<EinheitStatusGeaendertEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet EinheitStatusGeaendertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene EinheitStatusGeaendertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: EinheitStatusGeaendertEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for EinheitStatusGeaendert: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, ${event.alterStatus} → ${event.neuerStatus}`,
      'EinheitStatusGeaendertEtbHandler',
    );

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `Einheit ${event.name}: Status geändert von ${event.alterStatus} auf ${event.neuerStatus}`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.updatedBy,
        'PERSONAL', // ETB Kategorie für Personalbezogene Einträge
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'EinheitStatusGeaendert',
          einheitId: event.einheitId,
          alterStatus: event.alterStatus,
          neuerStatus: event.neuerStatus,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for EinheitStatusGeaendert: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'EinheitStatusGeaendertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for EinheitStatusGeaendert: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'EinheitStatusGeaendertEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for EinheitStatusGeaendert: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, ${event.alterStatus} → ${event.neuerStatus}`,
        'EinheitStatusGeaendertEtbHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for EinheitStatusGeaendert: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'EinheitStatusGeaendertEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
