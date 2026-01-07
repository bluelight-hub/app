import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { AccessTokenId } from '@domain/value-objects/access-token-id';
import { TokenHash } from '@domain/value-objects/token-hash';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaServerAccessTokenMapper } from '../mappers/prisma-server-access-token.mapper';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-basierte Implementierung des IServerAccessTokenRepository.
 *
 * Persistiert ServerAccessToken Aggregates und unterstützt
 * alle CRUD-Operationen sowie Token-spezifische Queries.
 *
 * **AGGREGATE PERSISTENCE STRATEGY:**
 *
 * 1. **Upsert Pattern:**
 *    - save() verwendet Prisma upsert() für CREATE vs UPDATE
 *    - Idempotent: save() kann mehrfach aufgerufen werden
 *
 * 2. **Transaction Support:**
 *    - Optional tx Parameter für atomare Multi-Aggregate Operations
 *    - Outbox Pattern Support für Event Consistency
 *
 * 3. **Security:**
 *    - Token-Hash wird nicht vollständig geloggt
 *    - Nur maskierte Darstellung in Logs (erste 8 Zeichen)
 *
 * @implements IServerAccessTokenRepository
 */
@Injectable()
export class PrismaServerAccessTokenRepository implements IServerAccessTokenRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * {@inheritDoc IServerAccessTokenRepository.findById}
   */
  async findById(id: AccessTokenId, tx?: TransactionContext): Promise<Result<ServerAccessToken | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const record = await client.serverAccessToken.findUnique({
        where: { id: id.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);
      return Result.ok(aggregate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find ServerAccessToken by ID', { tokenId: id.value, error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.findByTokenHash}
   */
  async findByTokenHash(tokenHash: TokenHash, tx?: TransactionContext): Promise<Result<ServerAccessToken | null>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const record = await client.serverAccessToken.findUnique({
        where: { tokenHash: tokenHash.value },
      });

      if (!record) {
        return Result.ok(null);
      }

      const aggregate = PrismaServerAccessTokenMapper.toAggregate(record);
      return Result.ok(aggregate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Maskiere Token-Hash in Logs für Security
      this.logger.error('Failed to find ServerAccessToken by hash', {
        tokenHashMasked: tokenHash.toMaskedString(),
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.findAllActive}
   */
  async findAllActive(tx?: TransactionContext): Promise<Result<ServerAccessToken[]>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const now = new Date();

    try {
      const records = await client.serverAccessToken.findMany({
        where: {
          isRevoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
      });

      const aggregates = records.map((record) => PrismaServerAccessTokenMapper.toAggregate(record));
      return Result.ok(aggregates);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to find active ServerAccessTokens', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.save}
   */
  async save(token: ServerAccessToken, tx?: TransactionContext): Promise<Result<void>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const data = PrismaServerAccessTokenMapper.toPersistence(token);

      await client.serverAccessToken.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          tokenHash: data.tokenHash,
          name: data.name,
          lastUsedAt: data.lastUsedAt,
          expiresAt: data.expiresAt,
          isRevoked: data.isRevoked,
          revokedAt: data.revokedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
        update: {
          // Mutable Felder
          name: data.name,
          lastUsedAt: data.lastUsedAt,
          isRevoked: data.isRevoked,
          revokedAt: data.revokedAt,
          updatedAt: data.updatedAt,
          // id, tokenHash, expiresAt, createdAt sind immutable
        },
      });

      // Clear Domain Events AFTER successful save
      token.clearDomainEvents();

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to save ServerAccessToken', {
        tokenId: token.id.value,
        error: message,
      });
      return Result.fail(`Failed to save ServerAccessToken: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.delete}
   */
  async delete(id: AccessTokenId, tx?: TransactionContext): Promise<Result<void>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      await client.serverAccessToken.delete({
        where: { id: id.value },
      });

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to delete ServerAccessToken', { tokenId: id.value, error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.existsByTokenHash}
   */
  async existsByTokenHash(tokenHash: TokenHash, tx?: TransactionContext): Promise<Result<boolean>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

    try {
      const count = await client.serverAccessToken.count({
        where: { tokenHash: tokenHash.value },
      });

      return Result.ok(count > 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to check ServerAccessToken existence', {
        tokenHashMasked: tokenHash.toMaskedString(),
        error: message,
      });
      return Result.fail(`Database error: ${message}`);
    }
  }

  /**
   * {@inheritDoc IServerAccessTokenRepository.countActive}
   */
  async countActive(tx?: TransactionContext): Promise<Result<number>> {
    const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
    const now = new Date();

    try {
      const count = await client.serverAccessToken.count({
        where: {
          isRevoked: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });

      return Result.ok(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to count active ServerAccessTokens', { error: message });
      return Result.fail(`Database error: ${message}`);
    }
  }
}
