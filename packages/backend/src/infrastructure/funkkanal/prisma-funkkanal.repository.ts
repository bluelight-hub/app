import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { TransactionContext } from '@domain/common/transaction';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import type { IFunkkanalRepository, FunkkanalReorderEntry } from '@domain/repositories/i-funkkanal.repository';
import { PrismaFunkkanalMapper, type FunkkanalWithZuordnungen } from './prisma-funkkanal.mapper';

type PrismaTx = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `IFunkkanalRepository`.
 *
 * Persistiert das Funkkanal-Aggregat (Root + Zuordnungen) atomar und delegiert
 * die Event-Ablage an die Outbox, die der `TransactionalCommandHandler` füllt
 * (Repository ruft `clearDomainEvents()` NICHT auf).
 */
@Injectable()
export class PrismaFunkkanalRepository implements IFunkkanalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(aggregate: FunkkanalAggregate, tx?: TransactionContext): Promise<void> {
    const { kanal, zuordnungen } = PrismaFunkkanalMapper.toPersistence(aggregate);

    const operation = async (client: PrismaTx): Promise<void> => {
      await client.funkkanal.upsert({
        where: { id: kanal.id },
        create: {
          id: kanal.id,
          einsatzId: kanal.einsatzId,
          name: kanal.name,
          detailsType: kanal.detailsType,
          detailsData: kanal.detailsData as Prisma.InputJsonValue,
          status: kanal.status,
          zweck: kanal.zweck,
          sortIndex: kanal.sortIndex,
          createdAt: kanal.createdAt,
          updatedAt: kanal.updatedAt,
          createdBy: kanal.createdBy,
          updatedBy: kanal.updatedBy,
        },
        update: {
          name: kanal.name,
          detailsType: kanal.detailsType,
          detailsData: kanal.detailsData as Prisma.InputJsonValue,
          status: kanal.status,
          zweck: kanal.zweck,
          sortIndex: kanal.sortIndex,
          updatedAt: kanal.updatedAt,
          updatedBy: kanal.updatedBy,
        },
      });

      const existingIds = new Set(
        (
          await client.funkkanalZuordnung.findMany({
            where: { kanalId: kanal.id },
            select: { id: true },
          })
        ).map((z) => z.id),
      );
      const desiredIds = new Set(zuordnungen.map((z) => z.id));

      const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));
      if (toDelete.length > 0) {
        await client.funkkanalZuordnung.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const z of zuordnungen) {
        if (existingIds.has(z.id)) {
          await client.funkkanalZuordnung.update({
            where: { id: z.id },
            data: {
              rufnameSnapshot: z.rufnameSnapshot,
              rolle: z.rolle,
            },
          });
        } else {
          await client.funkkanalZuordnung.create({
            data: {
              id: z.id,
              kanalId: z.kanalId,
              fahrzeugId: z.fahrzeugId,
              personId: z.personId,
              einheitId: z.einheitId,
              rufnameSnapshot: z.rufnameSnapshot,
              rolle: z.rolle,
              createdAt: z.createdAt,
              createdBy: z.createdBy,
            },
          });
        }
      }
    };

    if (tx) {
      await operation(tx as PrismaTx);
    } else {
      await this.prisma.$transaction(operation);
    }
  }

  async findById(id: FunkkanalId, tx?: TransactionContext): Promise<FunkkanalAggregate | null> {
    const client = (tx as PrismaTx | undefined) ?? this.prisma;
    const row = await client.funkkanal.findUnique({
      where: { id: id.value },
      include: { zuordnungen: true },
    });
    if (!row) {
      return null;
    }
    return PrismaFunkkanalMapper.toAggregate(row as FunkkanalWithZuordnungen);
  }

  async findByEinsatzId(einsatzId: EinsatzId, opts?: { includeArchived?: boolean }, tx?: TransactionContext): Promise<FunkkanalAggregate[]> {
    const client = (tx as PrismaTx | undefined) ?? this.prisma;
    const where: Prisma.FunkkanalWhereInput = { einsatzId: einsatzId.value };
    if (!opts?.includeArchived) {
      where.status = { not: 'archiviert' };
    }
    const rows = await client.funkkanal.findMany({
      where,
      include: { zuordnungen: true },
      orderBy: [{ sortIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row: FunkkanalWithZuordnungen) => PrismaFunkkanalMapper.toAggregate(row));
  }

  async existsByName(einsatzId: EinsatzId, name: string, excludeId?: FunkkanalId, tx?: TransactionContext): Promise<boolean> {
    const client = (tx as PrismaTx | undefined) ?? this.prisma;
    const where: Prisma.FunkkanalWhereInput = {
      einsatzId: einsatzId.value,
      name,
    };
    if (excludeId) {
      where.id = { not: excludeId.value };
    }
    const row = await client.funkkanal.findFirst({ where, select: { id: true } });
    return row !== null;
  }

  async hasFunkspruchReferenz(kanalId: FunkkanalId, tx?: TransactionContext): Promise<boolean> {
    const client = (tx as PrismaTx | undefined) ?? this.prisma;
    const rows = (await client.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM etb_eintraege
        WHERE "kontext_type" = 'funkspruch'
          AND "kontext_data"->>'kanalId' = ${kanalId.value}
        LIMIT 1
      ) AS exists
    `) as Array<{ exists: boolean }>;
    return rows[0]?.exists === true;
  }

  async delete(id: FunkkanalId, tx?: TransactionContext): Promise<void> {
    const client = (tx as PrismaTx | undefined) ?? this.prisma;
    await client.funkkanal.deleteMany({ where: { id: id.value } });
  }

  async reorder(einsatzId: EinsatzId, ordering: ReadonlyArray<FunkkanalReorderEntry>, tx?: TransactionContext): Promise<void> {
    const operation = async (client: PrismaTx): Promise<void> => {
      for (const entry of ordering) {
        await client.funkkanal.updateMany({
          where: { id: entry.id.value, einsatzId: einsatzId.value },
          data: { sortIndex: entry.sortIndex },
        });
      }
    };
    if (tx) {
      await operation(tx as PrismaTx);
    } else {
      await this.prisma.$transaction(operation);
    }
  }
}
