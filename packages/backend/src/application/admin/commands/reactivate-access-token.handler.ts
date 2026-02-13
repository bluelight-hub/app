import { Inject, Injectable } from '@nestjs/common';

import { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { TransactionContext } from '@domain/common/transaction';
import { ILogger } from '@domain/ports/i-logger.port';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { AccessTokenId } from '@domain/value-objects/access-token-id';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';

import { ReactivateAccessTokenCommand } from './reactivate-access-token.command';
import { TokenListItemDto } from '../dto/token-list-item.dto';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';

/**
 * Handler zum Reaktivieren eines widerrufenen Server-Access-Tokens.
 *
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 * Der Handler laedt das Token, ruft reactivate() auf und speichert die Aenderung.
 * Die Operation ist idempotent - mehrfaches Reaktivieren ist erlaubt.
 *
 * **Transaktionale Garantien:**
 * - Token-Status wird atomar aktualisiert
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback
 *
 * **Security Considerations:**
 * - Nur Token-Prefix wird geloggt (erste 12 Zeichen)
 * - Audit-Trail fuer Security Compliance
 *
 * @example
 * ```typescript
 * const command = ReactivateAccessTokenCommand.create({
 *   tokenId: 'blh_abc123def456ghi789jkl012',
 *   requestedById: 'user_123',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.status); // 'active'
 * }
 * ```
 */
@Injectable()
export class ReactivateAccessTokenHandler extends TransactionalCommandHandler<ReactivateAccessTokenCommand, TokenListItemDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt die Token-Reaktivierung in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Parse tokenId zu AccessTokenId Value Object
   * 2. Lade Token aus Repository
   * 3. Pruefe ob Token existiert
   * 4. Rufe reactivate() auf Aggregate (idempotent)
   * 5. Speichere Token
   * 6. Logge Audit-Trail
   * 7. Sammle Domain Events
   *
   * @param command - Validiertes ReactivateAccessTokenCommand
   * @param tx - Transaction Context
   * @returns Success mit TokenListItemDto oder Failure
   */
  protected async executeInTransaction(command: ReactivateAccessTokenCommand, tx: TransactionContext): Promise<Result<TokenListItemDto> | { result: TokenListItemDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Parse tokenId zu AccessTokenId Value Object
    // ════════════════════════════════════════════════════════════════════════
    const tokenIdResult = AccessTokenId.create(command.tokenId);
    if (tokenIdResult.isFailure || !tokenIdResult.value) {
      return Result.fail<TokenListItemDto>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Lade Token aus Repository
    // ════════════════════════════════════════════════════════════════════════
    const findResult = await this.tokenRepository.findById(tokenIdResult.value, tx);
    if (findResult.isFailure) {
      return Result.fail<TokenListItemDto>(findResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Pruefe ob Token existiert
    // ════════════════════════════════════════════════════════════════════════
    const token = findResult.value;
    if (!token) {
      return Result.fail<TokenListItemDto>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Rufe reactivate() auf Aggregate (idempotent - bereits aktiv ist OK)
    // ════════════════════════════════════════════════════════════════════════
    const reactivateResult = token.reactivate();
    if (reactivateResult.isFailure) {
      return Result.fail<TokenListItemDto>(reactivateResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. Speichere Token
    // ════════════════════════════════════════════════════════════════════════
    const saveResult = await this.tokenRepository.save(token, tx);
    if (saveResult.isFailure) {
      return Result.fail<TokenListItemDto>(saveResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. Audit-Log mit Token-ID (maskiert)
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(`Access token reactivated: "${token.name ?? 'Unnamed'}" (prefix: ${token.getDisplayPrefix()}...) by user ${command.requestedById}`);

    // ════════════════════════════════════════════════════════════════════════
    // 7. Domain Events sammeln
    // ════════════════════════════════════════════════════════════════════════
    const events = token.getDomainEvents();
    token.clearDomainEvents();

    // ════════════════════════════════════════════════════════════════════════
    // 8. Response zusammenstellen
    // ════════════════════════════════════════════════════════════════════════
    const response: TokenListItemDto = {
      id: token.id.toString(),
      name: token.name ?? '',
      prefix: token.getDisplayPrefix(),
      createdAt: token.createdAt.toISOString(),
      status: token.getStatus(),
      lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      expiresAt: token.expiresAt?.toISOString() ?? null,
      revokedAt: token.revokedAt?.toISOString() ?? null,
    };

    return { result: response, events };
  }
}
