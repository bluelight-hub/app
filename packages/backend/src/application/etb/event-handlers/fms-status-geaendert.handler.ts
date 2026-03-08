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
import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { LOGGER } from '@infrastructure/di-tokens';
import { AddEintragCommand } from '@application/etb/commands';
import { AddEintragHandler } from '@application/etb/commands';
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
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

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
      previousStatus: event.previousStatus,
      neuerStatus: event.neuerStatus,
    });

    try {
      // Validation: funkrufname sollte nicht undefined sein (korrupte Event-Daten)
      if (!event.funkrufname) {
        this.logger.warn(`FmsStatusGeaendertEvent has undefined funkrufname - possible corrupted data`, {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
        });
      }

      // ETB-ID entspricht der EinsatzId (1:1 Beziehung)
      const etbId = event.einsatzId;

      // Validation: Status-Codes müssen gültig sein (0-9, integer)
      // Sollte normalerweise nicht auftreten, da Domain bereits validiert.
      // Wenn korrupte Daten vorliegen, ABBRECHEN statt fehlerhafte Einträge zu erstellen.
      const isValidStatus = (status: number): status is keyof typeof FMS_STATUS_LABELS => {
        return Number.isInteger(status) && status >= 0 && status <= 9;
      };

      // CRITICAL: Bei ungültigen Status-Codes Event ABLEHNEN (Fire-and-Forget Error)
      // Grund: Korrupte Daten sollten nicht ins ETB geschrieben werden
      if (!isValidStatus(event.previousStatus) || !isValidStatus(event.neuerStatus)) {
        this.logger.error(`Invalid FMS status codes in event`, {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          previousStatus: event.previousStatus,
          neuerStatus: event.neuerStatus,
          severity: 'ERROR',
          actionRequired: 'Check domain validation logic - invalid status codes should be rejected earlier',
        });
        return; // Fire-and-Forget: Event verwerfen bei korrupten Daten
      }

      const previousLabel = FMS_STATUS_LABELS[event.previousStatus];
      const neuerLabel = FMS_STATUS_LABELS[event.neuerStatus];

      // ETB-Text mit Status-Änderung
      const text = `Fahrzeug ${event.funkrufname} Status: ${previousLabel} → ${neuerLabel}`;

      // Command erstellen mit Validierung
      // AddEintragCommand.create(etbId, text, userId, kategorie, einsatzId, absender, empfaenger, metadata)
      const commandResult = AddEintragCommand.create(
        etbId,
        text,
        event.geaendertVon,
        'FAHRZEUG', // ETB Kategorie für Fahrzeug-bezogene Einträge
        event.einsatzId,
        undefined, // absender - nicht relevant für automatische Einträge
        undefined, // empfaenger - nicht relevant für automatische Einträge
        {
          eventType: 'FmsStatusGeaendert',
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          previousStatus: event.previousStatus,
          neuerStatus: event.neuerStatus,
        },
      );

      if (commandResult.isFailure) {
        const errorContext = {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          funkrufname: event.funkrufname,
          error: commandResult.error,
          severity: 'ERROR',
          actionRequired: 'Check command validation logic',
        };
        this.logger.error(`Failed to create AddEintragCommand for FmsStatusGeaendert`, errorContext);
        // Fire-and-Forget Monitoring: Zusätzliches console.error für externe Monitoring-Systeme
        console.error('[FMS_ETB_ERROR]', errorContext);
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Command ausführen via injiziertem Handler
      // biome-ignore lint/style/noNonNullAssertion: Safe - already checked isFailure above
      const result = await this.addEintragHandler.execute(commandResult.value!);

      if (result.isFailure) {
        const errorContext = {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          funkrufname: event.funkrufname,
          previousStatus: event.previousStatus,
          neuerStatus: event.neuerStatus,
          error: result.error,
          severity: 'ERROR',
          actionRequired: 'Manual ETB entry may be needed',
        };
        this.logger.error(`Failed to add ETB entry for FmsStatusGeaendert`, errorContext);
        // Fire-and-Forget Monitoring: Zusätzliches console.error für externe Monitoring-Systeme
        console.error('[FMS_ETB_ERROR]', errorContext);
        return; // Fire-and-Forget: Nicht propagieren
      }

      // Erfolg: ETB-Eintrag wurde erstellt
      this.logger.log(`ETB entry created for FmsStatusGeaendert`, {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        funkrufname: event.funkrufname,
        previousStatus: `${event.previousStatusLabel} (${event.previousStatus})`,
        neuerStatus: `${event.neuerStatusLabel} (${event.neuerStatus})`,
      });
    } catch (error) {
      // Unerwarteter Fehler: Mit Stack Trace loggen für Monitoring/Alerting
      // CRITICAL: Fire-and-Forget Fehler - erfordert manuelle Nachbearbeitung
      const criticalContext = {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        funkrufname: event.funkrufname,
        previousStatus: event.previousStatus,
        neuerStatus: event.neuerStatus,
        geaendertVon: event.geaendertVon,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'CRITICAL',
        actionRequired: 'Manual ETB entry may be needed',
      };
      this.logger.error(`CRITICAL: Unexpected error during ETB entry creation for FmsStatusGeaendert`, criticalContext);
      // Fire-and-Forget Monitoring: Zusätzliches console.error für externe Monitoring-Systeme
      // Dies ermöglicht Log-Aggregation und Alerting via externe Tools (z.B. Sentry, Datadog)
      console.error('[FMS_ETB_CRITICAL]', criticalContext);
      // Fire-and-Forget: NICHT re-thrown!
    }
  }
}
