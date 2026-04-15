import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';

export interface FindAlarmierungenOptions {
  readonly status?: AlarmierungStatus;
  readonly take?: number;
  readonly skip?: number;
}

/**
 * Repository-Port für das Alarmierung-Aggregat (Issue #408).
 *
 * Implementierungen leben in der Infrastructure-Schicht
 * (`PrismaAlarmierungRepository`) und übernehmen die Abbildung
 * zwischen Aggregat und Prisma-Modellen inklusive Empfänger-Diff.
 */
export interface IAlarmierungRepository {
  save(aggregate: AlarmierungAggregate): Promise<void>;
  findById(id: AlarmierungId): Promise<AlarmierungAggregate | null>;
  findByEinsatzId(einsatzId: EinsatzId, options?: FindAlarmierungenOptions): Promise<AlarmierungAggregate[]>;
  /**
   * Findet alle aktiven Alarmierungen eines Einsatzes, die ein bestimmtes
   * Fahrzeug als Empfänger enthalten. Wird vom FMS-Event-Handler zur
   * Auto-Population benutzt.
   */
  findAktiveByFahrzeugId(einsatzId: EinsatzId, fahrzeugId: string): Promise<AlarmierungAggregate[]>;
}
