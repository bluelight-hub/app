import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import type { TransactionContext } from '@domain/common/transaction';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaBefehlMapper } from './mappers/prisma-befehl.mapper';
import { Result } from '@domain/common/result';
import type { PrismaClient } from '@/generated/prisma/client';

/**
 * Prisma Implementation des IBefehlRepository.
 *
 * **Persistence Strategy:**
 * - save(): Upsert mit nested Child-Entity writes
 * - findById()/findByEinsatzId(): Eager Loading von empfaenger + kommentare
 * - KEIN delete() (Append-Only Policy, GoBD-Compliance)
 */
@Injectable()
export class PrismaBefehlRepository implements IBefehlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(befehl: Befehl, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;
      const data = PrismaBefehlMapper.toPersistence(befehl);

      const { empfaenger, kommentare, ...befehlData } = data;

      await client.befehl.upsert({
        where: { id: data.id },
        create: {
          ...befehlData,
          empfaenger: {
            create: empfaenger,
          },
          kommentare: {
            create: kommentare,
          },
        },
        update: {
          ...befehlData,
          empfaenger: {
            deleteMany: {},
            create: empfaenger,
          },
          kommentare: {
            deleteMany: {},
            create: kommentare,
          },
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<void>(`Fehler beim Speichern des Befehls: ${message}`);
    }
  }

  async findById(id: BefehlId, tx?: TransactionContext): Promise<Result<Befehl | null>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      const prismaBefehl = await client.befehl.findUnique({
        where: { id: id.value },
        include: {
          empfaenger: true,
          kommentare: true,
        },
      });

      if (!prismaBefehl) {
        return Result.ok<Befehl | null>(null);
      }

      return Result.ok<Befehl | null>(PrismaBefehlMapper.toDomain(prismaBefehl));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<Befehl | null>(`Fehler beim Laden des Befehls: ${message}`);
    }
  }

  async findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<Befehl[]>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      const prismaBefehle = await client.befehl.findMany({
        where: { einsatzId: einsatzId.value },
        include: {
          empfaenger: true,
          kommentare: true,
        },
        orderBy: { erteiltAm: 'desc' },
      });

      const befehle = prismaBefehle.map((pb) => PrismaBefehlMapper.toDomain(pb));
      return Result.ok<Befehl[]>(befehle);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<Befehl[]>(`Fehler beim Laden der Befehle: ${message}`);
    }
  }
}
