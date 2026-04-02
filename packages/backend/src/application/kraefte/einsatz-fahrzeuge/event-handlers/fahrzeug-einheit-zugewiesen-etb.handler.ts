/**
 * ETB-Eintrag Auto-Creation bei Fahrzeug-Einheit-Zuweisung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Fahrzeug-Zuweisung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * - Zuweisung: "Fahrzeug {funkrufname} der Einheit {einheitName} zugewiesen"
 * - Entfernung: "Fahrzeug {funkrufname} von Einheit entfernt"
 *
 * @module application/kraefte/einsatz-fahrzeuge/event-handlers
 * @see FahrzeugEinheitZugewiesenEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { FahrzeugEinheitZugewiesenEvent } from '@domain/kraefte/events/fahrzeug-einheit-zugewiesen.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Fahrzeug-Einheit-Zuweisung.
 *
 * Verarbeitet FahrzeugEinheitZugewiesenEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Zuweisung oder Entfernung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Fahrzeug-Zuweisung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class FahrzeugEinheitZugewiesenEtbHandler implements IEventHandler<FahrzeugEinheitZugewiesenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet FahrzeugEinheitZugewiesenEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene FahrzeugEinheitZugewiesenEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: FahrzeugEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, einheitId=${event.einheitId}`,
      'FahrzeugEinheitZugewiesenEtbHandler',
    );

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = event.einheitId ? `Fahrzeug ${event.funkrufname} der Einheit ${event.einheitName} zugewiesen` : `Fahrzeug ${event.funkrufname} von Einheit entfernt`;

      // Command erstellen mit Validierung
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.updatedBy,
        'FAHRZEUG', // ETB Kategorie für Fahrzeugbezogene Einträge
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'FahrzeugEinheitZugewiesen',
          fahrzeugId: event.fahrzeugId,
          funkrufname: event.funkrufname,
          einheitId: event.einheitId,
          einheitName: event.einheitName,
          previousEinheitId: event.previousEinheitId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'FahrzeugEinheitZugewiesenEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'FahrzeugEinheitZugewiesenEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}`, 'FahrzeugEinheitZugewiesenEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for FahrzeugEinheitZugewiesen: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'FahrzeugEinheitZugewiesenEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
