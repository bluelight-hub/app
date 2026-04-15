import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaengerRef } from '@domain/aggregates/alarmierung/alarmierung-empfaenger-ref';
import { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { Alarmierung, ALARMIERUNG_STATUS_VALUES, type AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';
import { AlarmierungEmpfaengerId } from '@domain/value-objects/alarmierung-empfaenger-id';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { Alarmierung as PrismaAlarmierung, AlarmierungEmpfaenger as PrismaAlarmierungEmpfaenger } from '@/generated/prisma/client';

/**
 * Prisma-Shape einer Alarmierung mit eager-loaded Empfängern — wird vom
 * Repository beim Laden (`findById`, `findByEinsatzId`) gereicht.
 */
export type AlarmierungWithEmpfaenger = PrismaAlarmierung & {
  empfaenger: PrismaAlarmierungEmpfaenger[];
};

/**
 * Persistenz-Shape der Alarmierung-Root (Prisma-Upsert-Input).
 */
export interface AlarmierungPersistenceData {
  id: string;
  einsatzId: string;
  bezeichnung: string;
  beschreibung: string | null;
  alarmierungszeit: Date;
  status: AlarmierungStatus;
  ursprungAlarmierungId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}

/**
 * Persistenz-Shape eines Empfängers. Genau einer von
 * `fahrzeugId | personId | einheitId` ist gesetzt (Discriminator via
 * Check-Constraint der DB).
 */
export interface AlarmierungEmpfaengerPersistenceData {
  id: string;
  alarmierungId: string;
  fahrzeugId: string | null;
  personId: string | null;
  einheitId: string | null;
  nameSnapshot: string;
  alarmiertAm: Date;
  ausgeruecktAm: Date | null;
  vorOrtAm: Date | null;
  wiederFreiAm: Date | null;
  letzterFmsStatus: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string | null;
}

/**
 * Mapper zwischen `AlarmierungAggregate` und Prisma-Shapes.
 *
 * Zweiseitig:
 * - `toPersistence(aggregate)` → Root + Empfänger-Rows für Upsert/Diff.
 * - `toAggregate(row)` → rekonstruiertes Aggregat (ohne Event-Emission).
 *
 * Stateless, ohne Framework-Abhängigkeiten außer den generierten Prisma-Typen.
 */
export class PrismaAlarmierungMapper {
  static toPersistence(aggregate: AlarmierungAggregate): {
    alarmierung: AlarmierungPersistenceData;
    empfaenger: AlarmierungEmpfaengerPersistenceData[];
  } {
    const root = aggregate.alarmierung;
    const alarmierung: AlarmierungPersistenceData = {
      id: root.id.value,
      einsatzId: root.einsatzId.value,
      bezeichnung: root.bezeichnung,
      beschreibung: root.beschreibung ?? null,
      alarmierungszeit: root.alarmierungszeit,
      status: root.status,
      ursprungAlarmierungId: root.ursprungAlarmierungId?.value ?? null,
      createdAt: root.createdAt,
      updatedAt: root.updatedAt,
      createdBy: root.createdBy,
      updatedBy: root.updatedBy ?? null,
    };

    const empfaenger: AlarmierungEmpfaengerPersistenceData[] = aggregate.empfaenger.map((e) => ({
      id: e.id.value,
      alarmierungId: root.id.value,
      fahrzeugId: e.ref.kind === 'fahrzeug' ? e.ref.fahrzeugId : null,
      personId: e.ref.kind === 'person' ? e.ref.personId : null,
      einheitId: e.ref.kind === 'einheit' ? e.ref.einheitId : null,
      nameSnapshot: e.nameSnapshot,
      alarmiertAm: e.alarmiertAm,
      ausgeruecktAm: e.ausgeruecktAm,
      vorOrtAm: e.vorOrtAm,
      wiederFreiAm: e.wiederFreiAm,
      letzterFmsStatus: e.letzterFmsStatus,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      createdBy: e.createdBy,
      updatedBy: e.updatedBy ?? null,
    }));

    return { alarmierung, empfaenger };
  }

  static toAggregate(row: AlarmierungWithEmpfaenger): AlarmierungAggregate {
    const alarmierung = PrismaAlarmierungMapper.toEntity(row);
    const empfaenger = row.empfaenger.map((e) => PrismaAlarmierungMapper.toEmpfaengerEntity(e, alarmierung.id));
    return AlarmierungAggregate.reconstitute(alarmierung, empfaenger);
  }

  private static toEntity(row: PrismaAlarmierung): Alarmierung {
    const idResult = AlarmierungId.create(row.id);
    if (idResult.isFailure) {
      throw new Error(`Ungültige AlarmierungId in DB: ${idResult.error}`);
    }
    const einsatzIdResult = EinsatzId.create(row.einsatzId);
    if (einsatzIdResult.isFailure) {
      throw new Error(`Ungültige EinsatzId in DB: ${einsatzIdResult.error}`);
    }

    let ursprungId: AlarmierungId | undefined;
    if (row.ursprungAlarmierungId) {
      const r = AlarmierungId.create(row.ursprungAlarmierungId);
      if (r.isFailure) {
        throw new Error(`Ungültige ursprungAlarmierungId in DB: ${r.error}`);
      }
      ursprungId = r.value as AlarmierungId;
    }

    const status = PrismaAlarmierungMapper.parseStatus(row.status);

    return new Alarmierung(
      idResult.value as AlarmierungId,
      einsatzIdResult.value as EinsatzId,
      row.bezeichnung,
      row.beschreibung ?? undefined,
      row.alarmierungszeit,
      status,
      ursprungId,
      row.createdAt,
      row.updatedAt,
      row.createdBy,
      row.updatedBy ?? undefined,
    );
  }

  private static toEmpfaengerEntity(row: PrismaAlarmierungEmpfaenger, alarmierungId: AlarmierungId): AlarmierungEmpfaenger {
    const idResult = AlarmierungEmpfaengerId.create(row.id);
    if (idResult.isFailure) {
      throw new Error(`Ungültige AlarmierungEmpfaengerId in DB: ${idResult.error}`);
    }
    const ref = PrismaAlarmierungMapper.deriveEmpfaengerRef(row);

    return new AlarmierungEmpfaenger(
      idResult.value as AlarmierungEmpfaengerId,
      alarmierungId,
      ref,
      row.nameSnapshot,
      row.alarmiertAm,
      row.ausgeruecktAm ?? null,
      row.vorOrtAm ?? null,
      row.wiederFreiAm ?? null,
      row.letzterFmsStatus ?? null,
      row.createdAt,
      row.updatedAt,
      row.createdBy,
      row.updatedBy ?? undefined,
    );
  }

  private static deriveEmpfaengerRef(row: PrismaAlarmierungEmpfaenger): AlarmierungEmpfaengerRef {
    const set = [row.fahrzeugId, row.personId, row.einheitId].filter((v): v is string => typeof v === 'string' && v.length > 0);
    if (set.length !== 1) {
      throw new Error(`AlarmierungEmpfaenger ${row.id}: exakt eine Empfänger-Referenz erwartet, gefunden ${set.length}`);
    }
    if (row.fahrzeugId) return { kind: 'fahrzeug', fahrzeugId: row.fahrzeugId };
    if (row.personId) return { kind: 'person', personId: row.personId };
    return { kind: 'einheit', einheitId: row.einheitId as string };
  }

  private static parseStatus(value: string): AlarmierungStatus {
    if (!ALARMIERUNG_STATUS_VALUES.includes(value as AlarmierungStatus)) {
      throw new Error(`Ungültiger AlarmierungStatus in DB: ${value}`);
    }
    return value as AlarmierungStatus;
  }
}
