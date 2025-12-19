/**
 * ETB-Eintrag Auto-Creation bei Personen-Registrierung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Personen-Registrierung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * - Stammdaten: "Person {vorname} {nachname} registriert (Funktion: {funktion})"
 * - Temporär: "Temporäre Person {vorname} {nachname} registriert (Funktion: {funktion})"
 *
 * @module application/etb/event-handlers
 * @see EinsatzPersonHinzugefuegtEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { EinsatzPersonHinzugefuegtEvent } from '@domain/kraefte/events/einsatz-person-hinzugefuegt.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
// biome-ignore lint/style/useImportType: AddEintragHandler needed for DI at runtime
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';

/**
 * Event Handler für automatischen ETB-Eintrag bei Personen-Registrierung.
 *
 * Verarbeitet EinsatzPersonHinzugefuegtEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Personen-Registrierung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Personen-Registrierung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 *
 * **Event Flow (Transactional Outbox Pattern):**
 * 1. EinsatzPerson Command Handler erstellt EinsatzPerson Aggregate
 * 2. EinsatzPersonHinzugefuegtEvent wird atomar in Outbox persistiert
 * 3. OutboxEventPublisher pollt und publiziert Event
 * 4. Infrastructure Adapter empfängt Event via @OnEvent
 * 5. Adapter delegiert an diesen Handler via IEventHandler.handle()
 */
@Injectable()
export class EinsatzPersonHinzugefuegtEventHandler implements IEventHandler<EinsatzPersonHinzugefuegtEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet EinsatzPersonHinzugefuegtEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene EinsatzPersonHinzugefuegtEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: EinsatzPersonHinzugefuegtEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for EinsatzPersonHinzugefuegt`, {
      einsatzId: event.einsatzId,
      einsatzPersonId: event.einsatzPersonId,
      vorname: event.vorname,
      nachname: event.nachname,
      funktion: event.funktion,
    });

    try {
      // Validation: Namen sollten nicht leer sein (korrupte Event-Daten)
      if (!event.vorname || !event.nachname) {
        this.logger.warn(`EinsatzPersonHinzugefuegtEvent has missing name data - possible corrupted data`, {
          einsatzId: event.einsatzId,
          einsatzPersonId: event.einsatzPersonId,
          vorname: event.vorname,
          nachname: event.nachname,
        });
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // Unterscheidung zwischen temporär und Stammdaten
      const isTemporary = event.stammId === undefined;
      const prefix = isTemporary ? 'Temporäre Person' : 'Person';
      const text = `${prefix} ${event.vorname} ${event.nachname} registriert (Funktion: ${event.funktion})`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.registriertVon,
        'PERSONAL', // ETB Kategorie für Personalbezogene Einträge
        event.einsatzId,
        {
          eventType: 'EinsatzPersonHinzugefuegt',
          einsatzPersonId: event.einsatzPersonId,
          stammId: event.stammId,
          funktion: event.funktion,
        },
      );

      if (commandResult.isFailure) {
        const errorContext = {
          einsatzId: event.einsatzId,
          einsatzPersonId: event.einsatzPersonId,
          vorname: event.vorname,
          nachname: event.nachname,
          error: commandResult.error,
          severity: 'ERROR',
          actionRequired: 'Check command validation logic',
        };
        this.logger.error(`Failed to create AddEintragCommand for EinsatzPersonHinzugefuegt`, errorContext);
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        const errorContext = {
          einsatzId: event.einsatzId,
          einsatzPersonId: event.einsatzPersonId,
          vorname: event.vorname,
          nachname: event.nachname,
          funktion: event.funktion,
          error: result.error,
          severity: 'ERROR',
          actionRequired: 'Manual ETB entry may be needed',
        };
        this.logger.error(`Failed to add ETB entry for EinsatzPersonHinzugefuegt`, errorContext);
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for EinsatzPersonHinzugefuegt`, {
        einsatzId: event.einsatzId,
        einsatzPersonId: event.einsatzPersonId,
        vorname: event.vorname,
        nachname: event.nachname,
        funktion: event.funktion,
        isTemporary,
      });
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const criticalContext = {
        einsatzId: event.einsatzId,
        einsatzPersonId: event.einsatzPersonId,
        vorname: event.vorname,
        nachname: event.nachname,
        funktion: event.funktion,
        registriertVon: event.registriertVon,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'CRITICAL',
        actionRequired: 'Manual ETB entry may be needed',
      };
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation for EinsatzPersonHinzugefuegt`, criticalContext);
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
