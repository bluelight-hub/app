/**
 * ETB-Eintrag Auto-Creation bei FMS-Status-Änderung.
 *
 * Dieser Event Handler implementiert das Fire-and-Forget Pattern:
 * Fehler werden geloggt aber NICHT propagiert, um die Status-Änderung
 * nicht zu blockieren. ETB-Einträge können bei Bedarf manuell nacherstellt werden.
 *
 * **Clean Architecture:**
 * Dieser Handler ist framework-agnostisch und nutzt kein @OnEvent Decorator.
 * Der Infrastructure Layer Event Adapter delegiert an diese Implementation.
 *
 * **Eintrag-Text:**
 * "Fahrzeug {funkrufname} Status: {alterLabel} → {neuerLabel}"
 *
 * @module application/etb/event-handlers
 * @see FmsStatusGeaendertEvent - Trigger Event (Domain Event via Outbox)
 * @see AddEintragHandler - Delegierter Command Handler
 */
import { Injectable, Logger } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { AddEintragCommand } from '../commands/add-eintrag/add-eintrag.command';
// biome-ignore lint/style/useImportType: AddEintragHandler needed for DI at runtime
import { AddEintragHandler } from '../commands/add-eintrag/add-eintrag.handler';
import { FMS_STATUS_LABELS } from '@domain/kraefte/constants/einsatz-fahrzeug-validation.constants';

/**
 * Event Handler für automatischen ETB-Eintrag bei FMS-Status-Änderung.
 *
 * Verarbeitet FmsStatusGeaendertEvents und erstellt automatisch einen ETB-Eintrag
 * für die Dokumentation der Status-Änderung.
 *
 * **Fire-and-Forget Pattern:**
 * - Handler-Fehler werden geloggt, aber NICHT propagiert
 * - Status-Änderung wird NICHT blockiert bei ETB-Fehlern
 * - Idempotent: Duplicate Events können zu multiplen Einträgen führen (OK für ETB)
 *
 * **Event Flow (Transactional Outbox Pattern):**
 * 1. UpdateFmsStatusHandler ändert EinsatzFahrzeug Aggregate
 * 2. FmsStatusGeaendertEvent wird atomar in Outbox persistiert
 * 3. OutboxEventPublisher pollt und publiziert Event
 * 4. Infrastructure Adapter empfängt Event via @OnEvent
 * 5. Adapter delegiert an diesen Handler via IEventHandler.handle()
 */
@Injectable()
export class FmsStatusGeaendertEventHandler implements IEventHandler<FmsStatusGeaendertEvent> {
  private readonly logger = new Logger(FmsStatusGeaendertEventHandler.name);

  constructor(private readonly addEintragHandler: AddEintragHandler) {}

  /**
   * Verarbeitet FmsStatusGeaendertEvent und erstellt automatisch einen ETB-Eintrag.
   *
   * @param event - Das empfangene FmsStatusGeaendertEvent (Domain Event via Outbox)
   * @returns Promise<void> - Keine Rückgabe (Fire-and-Forget)
   */
  async handle(event: FmsStatusGeaendertEvent): Promise<void> {
    this.logger.log(`Creating ETB entry for FmsStatusGeaendert`, {
      einsatzId: event.einsatzId,
      einsatzFahrzeugId: event.einsatzFahrzeugId,
      funkrufname: event.funkrufname,
      alterStatus: event.alterStatus,
      neuerStatus: event.neuerStatus,
    });

    try {
      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // Status Labels für den Eintrag
      const alterLabel = FMS_STATUS_LABELS[event.alterStatus as keyof typeof FMS_STATUS_LABELS] ?? `Status ${event.alterStatus}`;
      const neuerLabel = FMS_STATUS_LABELS[event.neuerStatus as keyof typeof FMS_STATUS_LABELS] ?? `Status ${event.neuerStatus}`;

      // ETB-Text mit Status-Änderung
      const text = `Fahrzeug ${event.funkrufname} Status: ${alterLabel} → ${neuerLabel}`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.geaendertVon,
        'FAHRZEUG', // ETB Kategorie für Fahrzeug-bezogene Einträge
        event.einsatzId,
        {
          eventType: 'FmsStatusGeaendert',
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          alterStatus: event.alterStatus,
          neuerStatus: event.neuerStatus,
        },
      );

      if (commandResult.isFailure) {
        this.logger.error(`Failed to create AddEintragCommand for FmsStatusGeaendert`, {
          einsatzId: event.einsatzId,
          error: commandResult.error,
        });
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        this.logger.error(`Failed to add ETB entry for FmsStatusGeaendert`, {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          error: result.error,
        });
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for FmsStatusGeaendert`, {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        funkrufname: event.funkrufname,
        alterStatus: `${alterLabel} (${event.alterStatus})`,
        neuerStatus: `${neuerLabel} (${event.neuerStatus})`,
      });
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen
      this.logger.error(`Unexpected error during ETB entry creation for FmsStatusGeaendert`, {
        einsatzId: event.einsatzId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
