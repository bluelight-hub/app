import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

import { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { TransactionContext } from '@domain/common/transaction';
import { ILogger } from '@domain/ports/i-logger.port';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
import { ServerAccessTokenRotatedEvent } from '@domain/events/server-access-token-rotated.event';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { TokenHash } from '@domain/value-objects/token-hash';
import { AccessTokenId } from '@domain/value-objects/access-token-id';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { BCRYPT_COST_FACTOR_TOKEN } from '@/infrastructure/config/security.constants';

import { RotateAccessTokenCommand, RotateAccessTokenResult } from './rotate-access-token.command';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';
import { TOKEN_PREFIX } from '../constants/token.constants';

/**
 * Handler zum Rotieren eines Server-Access-Tokens.
 *
 * Bei einer Token-Rotation wird ein NEUES Token erstellt und das alte Token
 * widerrufen. Das neue Token verweist auf das alte Token via `rotatedFromId`
 * fuer vollstaendige Audit-Trail-Nachverfolgbarkeit.
 *
 * **WICHTIG: Rotation erzeugt NEUES Aggregate!**
 * Es ist NICHT ein Update des bestehenden Tokens:
 * 1. NEUER Token mit neuer ID, neuem Hash
 * 2. ALTER Token wird revoked
 * 3. Verknuepfung via `rotatedFromId`
 *
 * **Transaktionale Garantien:**
 * - Neuer Token wird in EINER Transaktion erstellt
 * - Alter Token wird in DERSELBEN Transaktion revoked
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback (beide Token unveraendert)
 *
 * **Security Considerations:**
 * - Neues Token wird mit bcrypt (cost 10) gehasht (NFR-S1)
 * - Raw-Token wird NUR in Response zurueckgegeben, NICHT geloggt
 * - Audit-Trail loggt nur Token-Prefix (erste 12 Zeichen)
 * - Altes Token ist sofort nach Rotation ungueltig
 *
 * **Event Flow:**
 * 1. ServerAccessTokenCreatedEvent (vom neuen Token)
 * 2. ServerAccessTokenRevokedEvent (vom alten Token)
 * 3. ServerAccessTokenRotatedEvent (Verknuepfung beider)
 *
 * @example
 * ```typescript
 * const command = RotateAccessTokenCommand.create({
 *   tokenId: 'blh_abc123def456ghi789jkl012',
 *   newName: 'CI/CD Token (rotated)',
 *   requestedById: 'user_123',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.token); // blh_xxx... (nur hier sichtbar!)
 *   console.log(result.value.rotatedFromId); // ID des alten Tokens
 * }
 * ```
 */
@Injectable()
export class RotateAccessTokenHandler extends TransactionalCommandHandler<RotateAccessTokenCommand, RotateAccessTokenResult> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt die Token-Rotation in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Parse tokenId zu AccessTokenId Value Object
   * 2. Lade altes Token aus Repository
   * 3. Validiere: Token existiert, nicht revoked, nicht expired
   * 4. Generiere neues Token: blh_ + cuid2 (24 Zeichen) = 28 total
   * 5. Extrahiere Prefix (erste 12 Zeichen: blh_xxxxxxxx)
   * 6. Hashe neues Token mit bcrypt (Cost Factor 10)
   * 7. Erstelle neues ServerAccessToken Aggregate mit rotatedFromId
   * 8. Revoke altes Token
   * 9. Speichere BEIDE Tokens im Repository
   * 10. Sammle Domain Events (Created, Revoked, Rotated)
   * 11. Logge Audit-Trail mit maskiertem Prefix
   *
   * @param command - Validiertes RotateAccessTokenCommand
   * @param tx - Transaction Context
   * @returns Success mit RotateAccessTokenResult oder Failure
   */
  protected async executeInTransaction(
    command: RotateAccessTokenCommand,
    tx: TransactionContext,
  ): Promise<Result<RotateAccessTokenResult> | { result: RotateAccessTokenResult; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Parse tokenId zu AccessTokenId Value Object
    // ════════════════════════════════════════════════════════════════════════
    const tokenIdResult = AccessTokenId.create(command.tokenId);
    if (tokenIdResult.isFailure || !tokenIdResult.value) {
      return Result.fail<RotateAccessTokenResult>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Lade altes Token aus Repository
    // ════════════════════════════════════════════════════════════════════════
    const findResult = await this.tokenRepository.findById(tokenIdResult.value, tx);
    if (findResult.isFailure) {
      return Result.fail<RotateAccessTokenResult>(findResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    const oldToken = findResult.value;
    if (!oldToken) {
      return Result.fail<RotateAccessTokenResult>(ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Validiere: Token darf nicht revoked sein
    // ════════════════════════════════════════════════════════════════════════
    if (oldToken.isRevoked) {
      return Result.fail<RotateAccessTokenResult>(ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Validiere: Token darf nicht expired sein
    // ════════════════════════════════════════════════════════════════════════
    if (!oldToken.isValid()) {
      return Result.fail<RotateAccessTokenResult>(ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. Generiere neues Token: blh_ + cuid2 (24 Zeichen) = 28 total
    // ════════════════════════════════════════════════════════════════════════
    const rawToken = `${TOKEN_PREFIX}${createId()}`;

    // ════════════════════════════════════════════════════════════════════════
    // 7. bcrypt-Hash mit Cost-Factor 10 erstellen (NFR-S1 compliant)
    // ════════════════════════════════════════════════════════════════════════
    let tokenHashValue: string;
    try {
      tokenHashValue = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);
    } catch (bcryptError) {
      const errorMessage = bcryptError instanceof Error ? bcryptError.message : 'Unknown bcrypt error';
      this.logger.error(`bcrypt.hash() failed during rotation: ${errorMessage}`, 'RotateAccessTokenHandler');
      return Result.fail<RotateAccessTokenResult>(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 8. TokenHash Value Object erstellen (validiert bcrypt-Format)
    // ════════════════════════════════════════════════════════════════════════
    const tokenHashResult = TokenHash.create(tokenHashValue);
    if (tokenHashResult.isFailure || !tokenHashResult.value) {
      return Result.fail<RotateAccessTokenResult>(tokenHashResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. Neues ServerAccessToken Aggregate erstellen MIT Verweis auf altes Token
    // Name: Nutze newName wenn angegeben, sonst behalte alten Namen
    // ════════════════════════════════════════════════════════════════════════
    const newTokenName = command.newName ?? oldToken.name;
    const newTokenResult = ServerAccessToken.create({
      tokenHash: tokenHashResult.value,
      name: newTokenName ?? undefined,
      expiresAt: oldToken.expiresAt ?? undefined,
      rotatedFromId: oldToken.id,
    });

    if (newTokenResult.isFailure || !newTokenResult.value) {
      return Result.fail<RotateAccessTokenResult>(newTokenResult.error ?? ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED);
    }

    const newToken = newTokenResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 10. Altes Token revoken
    // ════════════════════════════════════════════════════════════════════════
    const revokeResult = oldToken.revoke();
    if (revokeResult.isFailure) {
      return Result.fail<RotateAccessTokenResult>(revokeResult.error ?? ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 11. BEIDE Tokens speichern (neues Token zuerst, dann altes)
    // ════════════════════════════════════════════════════════════════════════
    const saveNewResult = await this.tokenRepository.save(newToken, tx);
    if (saveNewResult.isFailure) {
      return Result.fail<RotateAccessTokenResult>(saveNewResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    const saveOldResult = await this.tokenRepository.save(oldToken, tx);
    if (saveOldResult.isFailure) {
      return Result.fail<RotateAccessTokenResult>(saveOldResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 12. Audit-Log mit Token-Prefix (maskiert) - NICHT Raw-Token!
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(
      `Access token rotated: "${newTokenName ?? 'Unnamed'}" (old prefix: ${oldToken.getDisplayPrefix()}..., new prefix: ${newToken.getDisplayPrefix()}...) by user ${command.requestedById}`,
    );

    // ════════════════════════════════════════════════════════════════════════
    // 13. Domain Events sammeln
    // - ServerAccessTokenCreatedEvent (vom neuen Token via create())
    // - ServerAccessTokenRevokedEvent (vom alten Token via revoke())
    // - ServerAccessTokenRotatedEvent (Verknuepfung beider)
    // ════════════════════════════════════════════════════════════════════════
    const newTokenEvents = newToken.getDomainEvents();
    newToken.clearDomainEvents();

    const oldTokenEvents = oldToken.getDomainEvents();
    oldToken.clearDomainEvents();

    // Rotations-Event hinzufuegen
    const rotatedEvent = new ServerAccessTokenRotatedEvent(oldToken.id, newToken.id, new Date(), command.requestedById);

    const allEvents = [...newTokenEvents, ...oldTokenEvents, rotatedEvent];

    // ════════════════════════════════════════════════════════════════════════
    // 14. Response zusammenstellen mit Raw-Token (NUR hier sichtbar!)
    // ════════════════════════════════════════════════════════════════════════
    const response: RotateAccessTokenResult = {
      token: rawToken, // EINMALIG! Wird nie wieder angezeigt!
      name: newTokenName,
      prefix: newToken.getDisplayPrefix(),
      createdAt: newToken.createdAt.toISOString(),
      rotatedFromId: oldToken.id.toString(),
    };

    return { result: response, events: allEvents };
  }
}
