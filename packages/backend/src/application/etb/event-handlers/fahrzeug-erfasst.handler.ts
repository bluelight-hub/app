/**
 * ETB-Eintrag Auto-Creation bei Fahrzeug-Erfassung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Fahrzeug-Erfassung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * - Stammdaten: "Fahrzeug {funkrufname} erfasst (Status: Einsatzbereit)"
 * - Temporär: "Temporäres Fahrzeug {funkrufname} erfasst (Status: Einsatzbereit)"
 *
 * @module application/etb/event-handlers
 * @see FahrzeugErfasstEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { FahrzeugErfasstEvent } from '@domain/kraefte/events/fahrzeug-erfasst.event';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import { FMS_STATUS_LABELS } from '@domain/kraefte/constants/einsatz-fahrzeug-validation.constants';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Event Handler für automatischen ETB-Eintrag bei Fahrzeug-Erfassung.
 *
 * Verarbeitet FahrzeugErfasstEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Fahrzeug-Erfassung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Fahrzeug-Erfassung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 *
 * **Event Flow (Transactional Outbox Pattern):**
 * 1. ErfasseFahrzeugAusStammdatenHandler erstellt EinsatzFahrzeug Aggregate
 * 2. FahrzeugErfasstEvent wird atomar in Outbox persistiert
 * 3. OutboxEventPublisher pollt und publiziert Event
 * 4. Infrastructure Adapter empfängt Event via @OnEvent
 * 5. Adapter delegiert an diesen Handler via IEventHandler.handle()
 */
@Injectable()
export class FahrzeugErfasstEventHandler implements IEventHandler<FahrzeugErfasstEvent> {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Verarbeitet FahrzeugErfasstEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene FahrzeugErfasstEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: FahrzeugErfasstEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for FahrzeugErfasst`, {
      einsatzId: event.einsatzId,
      einsatzFahrzeugId: event.einsatzFahrzeugId,
      funkrufname: event.funkrufname,
    });

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // Status Label für den Eintrag
      const statusLabel = FMS_STATUS_LABELS[event.fmsStatus as keyof typeof FMS_STATUS_LABELS] ?? `Status ${event.fmsStatus}`;

      // Unterscheidung zwischen temporär und Stammdaten
      const isTemporary = event.stammId === undefined;
      const text = isTemporary ? `Temporäres Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})` : `Fahrzeug ${event.funkrufname} erfasst (Status: ${statusLabel})`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, absender, empfaenger, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.erfasstVon,
        'FAHRZEUG', // ETB Kategorie für Fahrzeug-bezogene Einträge
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'FahrzeugErfasst',
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          stammId: event.stammId,
          fmsStatus: event.fmsStatus,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand for FahrzeugErfasst`, {
          einsatzId: event.einsatzId,
          error: commandResult.error,
        });
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry for FahrzeugErfasst`, {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          error: result.error,
        });
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for FahrzeugErfasst`, {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        funkrufname: event.funkrufname,
      });
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen
      this.logger.error(`Unexpected error during ETB entry creation for FahrzeugErfasst`, {
        einsatzId: event.einsatzId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
