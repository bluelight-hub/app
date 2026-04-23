import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { GefaehrdungsbeurteilungVorlageReadModel, IGefaehrdungsbeurteilungVorlageRepository } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaGefaehrdungsbeurteilungVorlageMapper } from './mappers/gefaehrdungsbeurteilung-vorlage.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Adapter für `gefaehrdungsbeurteilung_vorlagen`. Vorlagen sind im
 * Backend Read-Only (Seeds laut Story 1.4) — es gibt daher keine Save- oder
 * Delete-Methode.
 */
@Injectable()
export class PrismaGefaehrdungsbeurteilungVorlageRepository implements IGefaehrdungsbeurteilungVorlageRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async findAktive(tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungVorlageReadModel[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const rows = await client.gefaehrdungsbeurteilungVorlage.findMany({
        where: { aktiv: true },
        orderBy: { name: 'asc' },
      });
      return Result.ok(rows.map((row) => PrismaGefaehrdungsbeurteilungVorlageMapper.toReadModel(row)));
    } catch (error) {
      this.logger.error('Fehler beim Laden aktiver Gefährdungsbeurteilungs-Vorlagen', {
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<GefaehrdungsbeurteilungVorlageReadModel[]>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async findById(id: string, tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungVorlageReadModel | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    try {
      const row = await client.gefaehrdungsbeurteilungVorlage.findUnique({ where: { id } });
      if (!row) return Result.ok<GefaehrdungsbeurteilungVorlageReadModel | null>(null);
      return Result.ok<GefaehrdungsbeurteilungVorlageReadModel>(PrismaGefaehrdungsbeurteilungVorlageMapper.toReadModel(row));
    } catch (error) {
      return Result.fail<GefaehrdungsbeurteilungVorlageReadModel | null>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }
}
