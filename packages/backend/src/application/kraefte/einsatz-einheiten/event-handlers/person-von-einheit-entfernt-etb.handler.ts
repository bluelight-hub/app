/**
 * ETB-Eintrag Auto-Creation bei Personen-Entfernung von Einheit.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Personen-Entfernung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * "Person {vorname} {nachname} von Einheit {name} entfernt"
 *
 * @module application/etb/event-handlers
 * @see PersonVonEinheitEntferntEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PersonVonEinheitEntferntEvent } from '@domain/kraefte/events/person-von-einheit-entfernt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';

/**
 * Event Handler für automatischen ETB-Eintrag bei Personen-Entfernung von Einheit.
 *
 * Verarbeitet PersonVonEinheitEntferntEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Entfernung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Personen-Entfernung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 */
@Injectable()
export class PersonVonEinheitEntferntEtbHandler implements IEventHandler<PersonVonEinheitEntferntEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet PersonVonEinheitEntferntEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonVonEinheitEntferntEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: PersonVonEinheitEntferntEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonVonEinheitEntfernt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, name=${event.personVorname} ${event.personNachname}`,
      'PersonVonEinheitEntferntEtbHandler',
    );

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `Person ${event.personVorname} ${event.personNachname} von Einheit ${event.einheitName} entfernt`;

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
          eventType: 'PersonVonEinheitEntfernt',
          einheitId: event.einheitId,
          einheitName: event.einheitName,
          personId: event.personId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonVonEinheitEntfernt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonVonEinheitEntferntEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // eslint-disable-next-line typescript/no-non-null-assertion -- Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonVonEinheitEntfernt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonVonEinheitEntferntEtbHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for PersonVonEinheitEntfernt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}`, 'PersonVonEinheitEntferntEtbHandler');
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonVonEinheitEntfernt: einsatzId=${event.einsatzId}, einheitId=${event.einheitId}, personId=${event.personId}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonVonEinheitEntferntEtbHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
