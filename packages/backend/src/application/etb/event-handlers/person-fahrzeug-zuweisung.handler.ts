/**
 * ETB-Eintrag Auto-Creation bei Fahrzeug-Zuweisungen.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Fahrzeug-Zuweisung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Texte:**
 * - PersonZuFahrzeugZugewiesenEvent: "{Vorname} {Nachname} zu {Funkrufname} zugewiesen"
 * - PersonVonFahrzeugEntferntEvent: "{Vorname} {Nachname} von {Funkrufname} entfernt"
 *
 * @module application/etb/event-handlers
 * @see PersonZuFahrzeugZugewiesenEvent - Trigger Event (Domain Event via Outbox)
 * @see PersonVonFahrzeugEntferntEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PersonZuFahrzeugZugewiesenEvent } from '@domain/kraefte/events/person-zu-fahrzeug-zugewiesen.event';
import type { PersonVonFahrzeugEntferntEvent } from '@domain/kraefte/events/person-von-fahrzeug-entfernt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
// biome-ignore lint/style/useImportType: AddEintragHandler needed for DI at runtime
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';

/**
 * Event Handler für automatische ETB-Einträge bei Fahrzeug-Zuweisungen.
 *
 * Verarbeitet PersonZuFahrzeugZugewiesenEvents und PersonVonFahrzeugEntferntEvents
 * und erstellt automatisch ETB-Einträge für die Dokumentation der Fahrzeug-Zuweisungen.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Fahrzeug-Zuweisung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 *
 * **Event Flow (Transactional Outbox Pattern):**
 * 1. EinsatzPerson Command Handler weist Person zu Fahrzeug zu
 * 2. PersonZuFahrzeugZugewiesenEvent wird atomar in Outbox persistiert
 * 3. OutboxEventPublisher pollt und publiziert Event
 * 4. Infrastructure Adapter empfängt Event via @OnEvent
 * 5. Adapter delegiert an diesen Handler via IEventHandler.handle()
 */
@Injectable()
export class PersonFahrzeugZuweisungHandler implements IEventHandler<PersonZuFahrzeugZugewiesenEvent>, IEventHandler<PersonVonFahrzeugEntferntEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet PersonZuFahrzeugZugewiesenEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonZuFahrzeugZugewiesenEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handleZugewiesen(event: PersonZuFahrzeugZugewiesenEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
      'PersonFahrzeugZuweisungHandler',
    );

    try {
      // Validation: Namen sollten nicht leer sein (korrupte Event-Daten)
      if (!event.personVorname || !event.personNachname) {
        this.logger.warn(
          `PersonZuFahrzeugZugewiesenEvent has missing person name data - possible corrupted data: einsatzId=${event.einsatzId}, personId=${event.personId}, vorname=${event.personVorname}, nachname=${event.personNachname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      if (!event.fahrzeugFunkrufname) {
        this.logger.warn(
          `PersonZuFahrzeugZugewiesenEvent has missing fahrzeug funkrufname - possible corrupted data: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, funkrufname=${event.fahrzeugFunkrufname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `${event.personVorname} ${event.personNachname} zu ${event.fahrzeugFunkrufname} zugewiesen`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.zugewiesenVon,
        'MASSNAHME', // ETB Kategorie für Massnahmen/Aktionen
        event.einsatzId,
        {
          eventType: 'PersonZuFahrzeugZugewiesen',
          personId: event.personId,
          fahrzeugId: event.fahrzeugId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
        'PersonFahrzeugZuweisungHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonZuFahrzeugZugewiesen: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, zugewiesenVon=${event.zugewiesenVon}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonFahrzeugZuweisungHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }

  /**
   * Verarbeitet PersonVonFahrzeugEntferntEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene PersonVonFahrzeugEntferntEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handleEntfernt(event: PersonVonFahrzeugEntferntEvent): Promise<void> {
    this.logger.log(
      `Creating ETB entry for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
      'PersonFahrzeugZuweisungHandler',
    );

    try {
      // Validation: Namen sollten nicht leer sein (korrupte Event-Daten)
      if (!event.personVorname || !event.personNachname) {
        this.logger.warn(
          `PersonVonFahrzeugEntferntEvent has missing person name data - possible corrupted data: einsatzId=${event.einsatzId}, personId=${event.personId}, vorname=${event.personVorname}, nachname=${event.personNachname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      if (!event.fahrzeugFunkrufname) {
        this.logger.warn(
          `PersonVonFahrzeugEntferntEvent has missing fahrzeug funkrufname - possible corrupted data: einsatzId=${event.einsatzId}, fahrzeugId=${event.fahrzeugId}, funkrufname=${event.fahrzeugFunkrufname}`,
          'PersonFahrzeugZuweisungHandler',
        );
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      const text = `${event.personVorname} ${event.personNachname} von ${event.fahrzeugFunkrufname} entfernt`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.entferntVon,
        'MASSNAHME', // ETB Kategorie für Massnahmen/Aktionen
        event.einsatzId,
        {
          eventType: 'PersonVonFahrzeugEntfernt',
          personId: event.personId,
          fahrzeugId: event.fahrzeugId,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(
          `Failed to create AddEintragCommand for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${commandResult.error}, severity=ERROR, actionRequired=Check command validation logic`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(
          `Failed to add ETB entry for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, error=${result.error}, severity=ERROR, actionRequired=Manual ETB entry may be needed`,
          'PersonFahrzeugZuweisungHandler',
        );
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(
        `ETB entry created for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}`,
        'PersonFahrzeugZuweisungHandler',
      );
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `CRITICAL: Unexpected error during ETB entry creation for PersonVonFahrzeugEntfernt: einsatzId=${event.einsatzId}, personId=${event.personId}, fahrzeugId=${event.fahrzeugId}, person=${event.personVorname} ${event.personNachname}, fahrzeug=${event.fahrzeugFunkrufname}, entferntVon=${event.entferntVon}, error=${errorMessage}, stack=${stack}, severity=CRITICAL, actionRequired=Manual ETB entry may be needed`,
        'PersonFahrzeugZuweisungHandler',
      );
      // Fire-and-Forget: NICHT re-thrown!
    }
  }

  /**
   * Generic handle method for IEventHandler interface compatibility.
   * This is required since the handler implements two different event types.
   * The infrastructure adapters will call handleZugewiesen() or handleEntfernt() directly.
   */
  async handle(event: PersonZuFahrzeugZugewiesenEvent | PersonVonFahrzeugEntferntEvent): Promise<void> {
    // Type guard to determine event type
    if ('zugewiesenVon' in event) {
      await this.handleZugewiesen(event as PersonZuFahrzeugZugewiesenEvent);
    } else if ('entferntVon' in event) {
      await this.handleEntfernt(event as PersonVonFahrzeugEntferntEvent);
    } else {
      this.logger.error('Unknown event type received in PersonFahrzeugZuweisungHandler.handle()', 'PersonFahrzeugZuweisungHandler');
    }
  }
}
