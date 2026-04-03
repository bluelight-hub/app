/**
 * ETB-Eintrag Auto-Creation bei Personen-Zuweisung zu Einheit.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Personen-Zuweisung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * "Person {vorname} {nachname} der Einheit {name} zugewiesen"
 *
 * @module application/etb/event-handlers
 * @see PersonZuEinheitZugewiesenEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PersonZuEinheitZugewiesenEvent } from '@domain/kraefte/events/person-zu-einheit-zugewiesen.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Personen-Zuweisung zu Einheit.
 *
 * Verarbeitet PersonZuEinheitZugewiesenEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Zuweisung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Personen-Zuweisung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class PersonZuEinheitZugewiesenEtbHandler implements IEventHandler<PersonZuEinheitZugewiesenEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet PersonZuEinheitZugewiesenEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonZuEinheitZugewiesenEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: PersonZuEinheitZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonZuEinheitZugewiesen: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, name=${event.personVorname} ${event.personNachname}`,
      'PersonZuEinheitZugewiesenEtbHandler',
    );

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `Person ${event.personVorname} ${event.personNachname} der Einheit ${event.einheitName} zugewiesen`;

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
          eventType: 'PersonZuEinheitZugewiesen',
          einheitId: event.einheitId,
          einheitName: event.einheitName,
          personId: event.personId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonZuEinheitZugewiesen: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonZuEinheitZugewiesenEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonZuEinheitZugewiesen: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonZuEinheitZugewiesenEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for PersonZuEinheitZugewiesen: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}`, 'PersonZuEinheitZugewiesenEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonZuEinheitZugewiesen: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonZuEinheitZugewiesenEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
