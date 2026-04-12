import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ITaktischesZeichenRepository } from '@domain/taktische-zeichen/ports/itaktisches-zeichen.repository';
import type { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { PrismaTaktischesZeichenMapper } from './prisma-taktisches-zeichen.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class PrismaTaktischesZeichenRepository implements ITaktischesZeichenRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async save(zeichen: TaktischesZeichen, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const data = PrismaTaktischesZeichenMapper.toPersistence(zeichen);

      await client.taktischesZeichen.upsert({
        where: { id: data.id },
        create: data,
        update: {
          zeichenDefinition: data.zeichenDefinition,
          referenzTyp: data.referenzTyp,
          referenzId: data.referenzId,
          lat: data.lat,
          lng: data.lng,
          mgrs: data.mgrs,
          lagekarteId: data.lagekarteId,
          label: data.label,
          notiz: data.notiz,
          updatedBy: data.updatedBy,
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error(`Failed to save TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<void>(`Database error: ${error}`);
    }
  }

  async findById(id: string): Promise<Result<TaktischesZeichen | null>> {
    try {
      const data = await this.prisma.taktischesZeichen.findUnique({ where: { id } });
      if (!data) return Result.ok<TaktischesZeichen | null>(null);
      return Result.ok<TaktischesZeichen>(PrismaTaktischesZeichenMapper.toDomain(data));
    } catch (error) {
      this.logger.error(`Failed to find TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen | null>(`Database error: ${error}`);
    }
  }

  async findByEinsatzId(einsatzId: string): Promise<Result<TaktischesZeichen[]>> {
    try {
      const data = await this.prisma.taktischesZeichen.findMany({
        where: { einsatzId },
        orderBy: { createdAt: 'asc' },
      });
      return Result.ok<TaktischesZeichen[]>(data.map(PrismaTaktischesZeichenMapper.toDomain));
    } catch (error) {
      this.logger.error(`Failed to find TaktischeZeichen für Einsatz: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen[]>(`Database error: ${error}`);
    }
  }

  async findByLagekarteId(lagekarteId: string): Promise<Result<TaktischesZeichen[]>> {
    try {
      const data = await this.prisma.taktischesZeichen.findMany({
        where: { lagekarteId },
        orderBy: { createdAt: 'asc' },
      });
      return Result.ok<TaktischesZeichen[]>(data.map(PrismaTaktischesZeichenMapper.toDomain));
    } catch (error) {
      this.logger.error(`Failed to find TaktischeZeichen für Lagekarte: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<TaktischesZeichen[]>(`Database error: ${error}`);
    }
  }

  async delete(id: string, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      await client.taktischesZeichen.delete({ where: { id } });
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error(`Failed to delete TaktischesZeichen: ${error}`, 'PrismaTaktischesZeichenRepository');
      return Result.fail<void>(`Database error: ${error}`);
    }
  }
}
