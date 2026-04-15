import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import type { FindAlarmierungenOptions, IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import { PrismaAlarmierungMapper, type AlarmierungWithEmpfaenger } from './prisma-alarmierung.mapper';

type PrismaTx = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `IAlarmierungRepository` (Issue #408).
 *
 * Persistiert das Alarmierung-Aggregat (Root + Empfänger) atomar per
 * `$transaction`. Empfänger werden via ID-Diff inkrementell angeglichen
 * (analog `PrismaFunkkanalRepository`).
 *
 * Event-Ablage erfolgt in der Outbox durch den aufrufenden
 * `TransactionalCommandHandler` — das Repository ruft `clearDomainEvents()`
 * NICHT auf.
 */
@Injectable()
export class PrismaAlarmierungRepository implements IAlarmierungRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(aggregate: AlarmierungAggregate): Promise<void> {
    const { alarmierung, empfaenger } = PrismaAlarmierungMapper.toPersistence(aggregate);

    await this.prisma.$transaction(async (client: PrismaTx) => {
      await client.alarmierung.upsert({
        where: { id: alarmierung.id },
        create: {
          id: alarmierung.id,
          einsatzId: alarmierung.einsatzId,
          bezeichnung: alarmierung.bezeichnung,
          beschreibung: alarmierung.beschreibung,
          alarmierungszeit: alarmierung.alarmierungszeit,
          status: alarmierung.status,
          ursprungAlarmierungId: alarmierung.ursprungAlarmierungId,
          createdAt: alarmierung.createdAt,
          updatedAt: alarmierung.updatedAt,
          createdBy: alarmierung.createdBy,
          updatedBy: alarmierung.updatedBy,
        },
        update: {
          bezeichnung: alarmierung.bezeichnung,
          beschreibung: alarmierung.beschreibung,
          status: alarmierung.status,
          updatedAt: alarmierung.updatedAt,
          updatedBy: alarmierung.updatedBy,
        },
      });

      const existing = await client.alarmierungEmpfaenger.findMany({
        where: { alarmierungId: alarmierung.id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((r) => r.id));
      const desiredIds = new Set(empfaenger.map((e) => e.id));

      const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));
      if (toDelete.length > 0) {
        await client.alarmierungEmpfaenger.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const e of empfaenger) {
        if (existingIds.has(e.id)) {
          await client.alarmierungEmpfaenger.update({
            where: { id: e.id },
            data: {
              nameSnapshot: e.nameSnapshot,
              ausgeruecktAm: e.ausgeruecktAm,
              vorOrtAm: e.vorOrtAm,
              wiederFreiAm: e.wiederFreiAm,
              letzterFmsStatus: e.letzterFmsStatus,
              updatedAt: e.updatedAt,
              updatedBy: e.updatedBy,
            },
          });
        } else {
          await client.alarmierungEmpfaenger.create({
            data: {
              id: e.id,
              alarmierungId: e.alarmierungId,
              fahrzeugId: e.fahrzeugId,
              personId: e.personId,
              einheitId: e.einheitId,
              nameSnapshot: e.nameSnapshot,
              alarmiertAm: e.alarmiertAm,
              ausgeruecktAm: e.ausgeruecktAm,
              vorOrtAm: e.vorOrtAm,
              wiederFreiAm: e.wiederFreiAm,
              letzterFmsStatus: e.letzterFmsStatus,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
              createdBy: e.createdBy,
              updatedBy: e.updatedBy,
            },
          });
        }
      }
    });
  }

  async findById(id: AlarmierungId): Promise<AlarmierungAggregate | null> {
    const row = await this.prisma.alarmierung.findUnique({
      where: { id: id.value },
      include: { empfaenger: true },
    });
    if (!row) {
      return null;
    }
    return PrismaAlarmierungMapper.toAggregate(row as AlarmierungWithEmpfaenger);
  }

  async findByEinsatzId(einsatzId: EinsatzId, options?: FindAlarmierungenOptions): Promise<AlarmierungAggregate[]> {
    const where: Prisma.AlarmierungWhereInput = { einsatzId: einsatzId.value };
    if (options?.status) {
      where.status = options.status as AlarmierungStatus;
    }
    const rows = await this.prisma.alarmierung.findMany({
      where,
      include: { empfaenger: true },
      orderBy: [{ alarmierungszeit: 'desc' }, { createdAt: 'desc' }],
      take: options?.take,
      skip: options?.skip,
    });
    return rows.map((row) => PrismaAlarmierungMapper.toAggregate(row as AlarmierungWithEmpfaenger));
  }

  async findAktiveByFahrzeugId(einsatzId: EinsatzId, fahrzeugId: string): Promise<AlarmierungAggregate[]> {
    const rows = await this.prisma.alarmierung.findMany({
      where: {
        einsatzId: einsatzId.value,
        status: 'aktiv',
        empfaenger: {
          some: { fahrzeugId },
        },
      },
      include: { empfaenger: true },
      orderBy: [{ alarmierungszeit: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => PrismaAlarmierungMapper.toAggregate(row as AlarmierungWithEmpfaenger));
  }
}
