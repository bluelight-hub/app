import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { EinsatzCreatedEvent } from '@domain/events/einsatz-created.event';
import type { EinsatzUpdatedEvent } from '@domain/events/einsatz-updated.event';
import type { EinsatzStatusChangedEvent } from '@domain/events/einsatz-status-changed.event';
import type { EinsatzCompletedEvent } from '@domain/events/einsatz-completed.event';
import type { EinsatzArchivedEvent } from '@domain/events/einsatz-archived.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EVENT_NAMES } from '@domain/events/event-names';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Event Handler für Einsatz Domain Events.
 *
 * Dieser Handler demonstriert das Event-Handler-Pattern und loggt alle
 * Einsatz-Events für Debugging und Audit-Zwecke. In Produktion würde
 * ein separater Handler für Audit-Logging implementiert werden.
 *
 * **Fire-and-Forget Pattern:**
 * Handler-Fehler werden intern gefangen und geloggt, aber nicht propagiert.
 * Dies verhindert, dass Event-Handler die Haupt-Transaktion beeinflussen.
 *
 * **Async Handler:**
 * Alle Handler sind async, um await-Support für zukünftige Operationen
 * (z.B. externe API-Calls) zu ermöglichen.
 */
@Injectable()
export class EinsatzEventLoggerHandler {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Handler für EinsatzCreatedEvent.
   * Loggt die Erstellung eines neuen Einsatzes.
   */
  @OnEvent(EVENT_NAMES.EINSATZ.CREATED)
  async handleEinsatzCreated(event: EinsatzCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Einsatz erstellt: ${event.alarmstichwort}`, {
        einsatzId: event.einsatzId.value,
        nummer: event.nummer,
        alarmstichwort: event.alarmstichwort,
        createdBy: event.createdBy.value,
        eventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle EinsatzCreatedEvent`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handler für EinsatzUpdatedEvent.
   * Loggt Aktualisierungen an einem existierenden Einsatz.
   */
  @OnEvent(EVENT_NAMES.EINSATZ.UPDATED)
  async handleEinsatzUpdated(event: EinsatzUpdatedEvent): Promise<void> {
    try {
      this.logger.log(`Einsatz aktualisiert`, {
        einsatzId: event.einsatzId.value,
        updates: event.updates,
        eventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle EinsatzUpdatedEvent`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handler für EinsatzStatusChangedEvent.
   * Loggt Status-Transitionen eines Einsatzes.
   */
  @OnEvent(EVENT_NAMES.EINSATZ.STATUS_CHANGED)
  async handleEinsatzStatusChanged(event: EinsatzStatusChangedEvent): Promise<void> {
    try {
      this.logger.log(`Einsatz Status geaendert: ${event.oldStatus.value} -> ${event.newStatus.value}`, {
        einsatzId: event.einsatzId.value,
        oldStatus: event.oldStatus.value,
        newStatus: event.newStatus.value,
        eventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle EinsatzStatusChangedEvent`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handler für EinsatzCompletedEvent.
   * Loggt den Abschluss eines Einsatzes.
   */
  @OnEvent(EVENT_NAMES.EINSATZ.COMPLETED)
  async handleEinsatzCompleted(event: EinsatzCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Einsatz abgeschlossen`, {
        einsatzId: event.einsatzId.value,
        completedBy: event.completedBy.value,
        completedAt: event.completedAt.toISOString(),
        eventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle EinsatzCompletedEvent`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handler für EinsatzArchivedEvent.
   * Loggt die Archivierung eines Einsatzes.
   */
  @OnEvent(EVENT_NAMES.EINSATZ.ARCHIVED)
  async handleEinsatzArchived(event: EinsatzArchivedEvent): Promise<void> {
    try {
      this.logger.log(`Einsatz archiviert`, {
        einsatzId: event.einsatzId.value,
        archivedBy: event.archivedBy.value,
        eventId: event.eventId,
      });
    } catch (error) {
      this.logger.error(`Failed to handle EinsatzArchivedEvent`, {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
