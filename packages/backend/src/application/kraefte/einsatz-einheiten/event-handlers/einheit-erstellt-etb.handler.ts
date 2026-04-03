/**
 * ETB-Eintrag Auto-Creation bei Einheit-Erstellung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Einheit-Erstellung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * "Einheit {name} ({typ}) aufgestellt"
 *
 * @module application/etb/event-handlers
 * @see EinheitErstelltEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { EinheitErstelltEvent } from '@domain/kraefte/events/einheit-erstellt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Einheit-Erstellung.
 *
 * Verarbeitet EinheitErstelltEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Einheit-Aufstellung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Einheit-Erstellung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class EinheitErstelltEtbHandler implements IEventHandler<EinheitErstelltEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet EinheitErstelltEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene EinheitErstelltEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: EinheitErstelltEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for EinheitErstellt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, typ=${event.typ}`, 'EinheitErstelltEtbHandler');

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `Einheit ${event.name} (${event.typ}) aufgestellt`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.createdBy,
        'PERSONAL', // ETB Kategorie für Personalbezogene Einträge
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'EinheitErstellt',
          einheitId: event.einheitId,
          typ: event.typ,
          funktion: event.funktion,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for EinheitErstellt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'EinheitErstelltEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for EinheitErstellt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'EinheitErstelltEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for EinheitErstellt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}`, 'EinheitErstelltEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for EinheitErstellt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, name=${event.name}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'EinheitErstelltEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
