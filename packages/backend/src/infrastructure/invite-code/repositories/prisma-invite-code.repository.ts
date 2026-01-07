import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { InviteCode } from '@domain/aggregates/invite-code.aggregate';
import type { IInviteCodeRepository, InviteCodeFilters, InviteCodePaginatedResult, InviteCodePaginationOptions, InviteCodeSortOptions } from '@domain/repositories/i-invite-code.repository';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';
import { InviteCodeValue } from '@domain/value-objects/invite-code-value';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaInviteCodeMapper } from '../mappers/prisma-invite-code.mapper';

/**
 * Transaction Client Type Alias fuer bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-basierte Implementierung des IInviteCodeRepository.
 *
 * Persistiert InviteCode Aggregates und unterstuetzt alle CRUD-Operationen
 * sowie InviteCode-spezifische Queries (findByCode, findByCreator).
 *
 * **AGGREGATE PERSISTENCE STRATEGY:**
 *
 * 1. **Upsert Pattern:**
 *    - save() verwendet Prisma upsert() fuer CREATE vs UPDATE
 *    - Idempotent: save() kann mehrfach aufgerufen werden
 *
 * 2. **Transaction Support:**
 *    - Optional tx Parameter fuer atomare Multi-Aggregate Operations
 *    - Outbox Pattern Support fuer Event Consistency
 *
 * 3. **Security:**
 *    - Invite-Codes werden nicht vollstaendig geloggt
 *    - Maskierte Darstellung in Logs (z.B. "ABC1****")
 *
 * @implements IInviteCodeRepository
 */
@Injectable()
export class PrismaInviteCodeRepository implements IInviteCodeRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * {@inheritDoc IInviteCodeRepository.findById}
   */
  async findById(id: InviteCodeId, tx?: TransactionContext): Promise<Result<InviteCode | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const record = await client.inviteCode.findUnique({
        where: { id: id.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      const aggregate = PrismaInviteCodeMapper.toAggregate(record);
      return Result.ok(aggregate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find InviteCode by ID', { inviteCodeId: id.value, error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.findByCode}
   */
  async findByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<Result<InviteCode | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const record = await client.inviteCode.findUnique({
        where: { code: code.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      const aggregate = PrismaInviteCodeMapper.toAggregate(record);
      return Result.ok(aggregate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Maskiere Code in Logs fuer Security
      this.logger.error('Failed to find InviteCode by code', {
        codeMasked: code.toMasked(),
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.findAllActive}
   */
  async findAllActive(tx?: TransactionContext): Promise<Result<InviteCode[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const now = new Date();

    try {
      const records = await client.inviteCode.findMany({
        where: {
          isRevoked: false,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      const aggregates = records.map((record) => PrismaInviteCodeMapper.toAggregate(record));
      return Result.ok(aggregates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find active InviteCodes', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.findByCreator}
   */
  async findByCreator(createdById: string, tx?: TransactionContext): Promise<Result<InviteCode[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const records = await client.inviteCode.findMany({
        where: { createdById },
        orderBy: { createdAt: 'desc' },
      });

      const aggregates = records.map((record) => PrismaInviteCodeMapper.toAggregate(record));
      return Result.ok(aggregates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find InviteCodes by creator', { createdById, error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.save}
   */
  async save(inviteCode: InviteCode, tx?: TransactionContext): Promise<Result<void>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const data = PrismaInviteCodeMapper.toPersistence(inviteCode);

      await client.inviteCode.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          code: data.code,
          expiresAt: data.expiresAt,
          maxUses: data.maxUses,
          useCount: data.useCount,
          createdById: data.createdById,
          label: data.label,
          isRevoked: data.isRevoked,
          revokedAt: data.revokedAt,
          createdAt: data.createdAt,
        },
        update: {
          // Mutable Felder
          useCount: data.useCount,
          label: data.label,
          isRevoked: data.isRevoked,
          revokedAt: data.revokedAt,
          // id, code, expiresAt, maxUses, createdById, createdAt sind immutable
        },
      });

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save InviteCode', {
        inviteCodeId: inviteCode.id.value,
        codeMasked: inviteCode.code.toMasked(),
        error: message,
      });
      return Result.fail(`Failed to save InviteCode: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.existsByCode}
   */
  async existsByCode(code: InviteCodeValue, tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const count = await client.inviteCode.count({
        where: { code: code.value },
      });

      return Result.ok(count > 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to check InviteCode existence', {
        codeMasked: code.toMasked(),
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.countActive}
   */
  async countActive(tx?: TransactionContext): Promise<Result<number>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const now = new Date();

    try {
      const count = await client.inviteCode.count({
        where: {
          isRevoked: false,
          expiresAt: { gt: now },
        },
      });

      return Result.ok(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to count active InviteCodes', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IInviteCodeRepository.findAll}
   *
   * Implementiert paginierte Abfrage mit Filterung und Sortierung.
   *
   * **Status-Filterung:**
   * Da der Status ein computed field ist (berechnet aus isRevoked, expiresAt, usedCount),
   * wird die Filterung in zwei Phasen durchgefuehrt:
   * 1. Datenbankabfrage mit createdById-Filter (falls gesetzt)
   * 2. Memory-Filter fuer Status (da computed field)
   *
   * **Performance-Hinweis:**
   * Bei Status-Filterung wird zuerst ALLE passenden Records geladen und dann gefiltert.
   * Bei grossen Datenmengen sollte Status-Filterung durch DB-Queries optimiert werden.
   */
  async findAll(filters?: InviteCodeFilters, sort?: InviteCodeSortOptions, pagination?: InviteCodePaginationOptions, tx?: TransactionContext): Promise<Result<InviteCodePaginatedResult<InviteCode>>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const page = pagination?.page ?? 1;
    const pageSize = Math.min(pagination?.pageSize ?? 20, 100); // Max 100 Eintraege pro Seite
    const skip = (page - 1) * pageSize;

    try {
      // Where-Clause bauen (nur DB-filterbare Felder)
      const where: Prisma.InviteCodeWhereInput = {};

      if (filters?.createdById) {
        where.createdById = filters.createdById;
      }

      // Sortierung
      const orderBy: Prisma.InviteCodeOrderByWithRelationInput = {};
      if (sort) {
        orderBy[sort.field] = sort.direction;
      } else {
        orderBy.createdAt = 'desc'; // Default: neueste zuerst
      }

      // Bei Status-Filter: Alle laden und im Memory filtern (da computed field)
      if (filters?.status) {
        // Alle Records laden (ohne Pagination)
        const allRecords = await client.inviteCode.findMany({
          where,
          orderBy,
        });

        // Zu Domain Aggregates mappen
        let allItems = allRecords.map((record) => PrismaInviteCodeMapper.toAggregate(record));

        // Status-Filter im Memory anwenden
        allItems = allItems.filter((item) => item.computeStatus() === filters.status);

        // Manuell paginieren
        const filteredTotal = allItems.length;
        const filteredTotalPages = Math.ceil(filteredTotal / pageSize);
        const filteredItems = allItems.slice(skip, skip + pageSize);

        return Result.ok({
          items: filteredItems,
          total: filteredTotal,
          page,
          pageSize,
          totalPages: filteredTotalPages,
        });
      }

      // Standard-Fall: Direkte DB-Pagination
      const [records, total] = await Promise.all([
        client.inviteCode.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
        }),
        client.inviteCode.count({ where }),
      ]);

      // Zu Domain Aggregates mappen
      const items = records.map((record) => PrismaInviteCodeMapper.toAggregate(record));

      return Result.ok({
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find all InviteCodes', {
        filters: filters ? JSON.stringify(filters) : 'none',
        page,
        pageSize,
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }
}
