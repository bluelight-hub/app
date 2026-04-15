import { Inject, Injectable } from '@nestjs/common';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ALARMIERUNG_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';

/**
 * Application-Handler: Auto-Population der Empfänger-Zeitpunkte einer
 * Alarmierung anhand von FMS-Statuswechseln des zugeordneten Fahrzeugs.
 *
 * Lädt alle aktiven Alarmierungen des Einsatzes, die das Fahrzeug als
 * Empfänger enthalten, und ruft pro Aggregat
 * {@link AlarmierungAggregate.aktualisiereZeitpunktAusFms} auf. Persistiert
 * jedes geänderte Aggregat einzeln (kein Cross-Aggregate-Atom).
 *
 * **Fire-and-Forget:** Fehler werden geloggt, nicht propagiert — der
 * FMS-Statuswechsel selbst bleibt davon unberührt.
 */
@Injectable()
export class FmsStatusZuAlarmierungHandler implements IEventHandler<FmsStatusGeaendertEvent> {
  constructor(
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async handle(event: FmsStatusGeaendertEvent): Promise<void> {
    try {
      const einsatzIdResult = EinsatzId.create(event.einsatzId);
      if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
        this.logger.warn('FmsStatusZuAlarmierungHandler: ungültige einsatzId', {
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          error: einsatzIdResult.error,
        });
        return;
      }

      const aggregates = await this.alarmierungRepository.findAktiveByFahrzeugId(einsatzIdResult.value, event.einsatzFahrzeugId);
      if (aggregates.length === 0) {
        return;
      }

      const occurredAt = event.occurredAt ?? new Date();
      for (const aggregate of aggregates) {
        const updateResult = aggregate.aktualisiereZeitpunktAusFms(event.einsatzFahrzeugId, event.neuerStatus, occurredAt);
        if (updateResult.isFailure) {
          this.logger.warn('FmsStatusZuAlarmierungHandler: Aggregat-Update fehlgeschlagen', {
            alarmierungId: aggregate.id.value,
            einsatzFahrzeugId: event.einsatzFahrzeugId,
            neuerStatus: event.neuerStatus,
            error: updateResult.error,
          });
          continue;
        }
        try {
          await this.alarmierungRepository.save(aggregate);
        } catch (saveError) {
          this.logger.error('FmsStatusZuAlarmierungHandler: Speichern fehlgeschlagen', {
            alarmierungId: aggregate.id.value,
            error: saveError instanceof Error ? saveError.message : String(saveError),
          });
        }
      }
    } catch (error) {
      this.logger.error('FmsStatusZuAlarmierungHandler: unerwarteter Fehler', {
        einsatzId: event.einsatzId,
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
