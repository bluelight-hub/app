import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';

// biome-ignore lint/style/useImportType: DomainEvent wird fuer Runtime-Typisierung benoetigt
import { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: TransactionContext wird fuer Runtime-Typisierung benoetigt
import { TransactionContext } from '@domain/common/transaction';
// biome-ignore lint/style/useImportType: ILogger wird fuer NestJS DI benoetigt
import { ILogger } from '@domain/ports/i-logger.port';
import { ServerAccessToken } from '@domain/aggregates/server-access-token.aggregate';
// biome-ignore lint/style/useImportType: IOutboxRepository wird fuer NestJS DI benoetigt
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: IServerAccessTokenRepository wird fuer NestJS DI benoetigt
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import { TokenHash } from '@domain/value-objects/token-hash';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService wird zur Laufzeit fuer NestJS DI benoetigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { BCRYPT_COST_FACTOR_TOKEN } from '@/infrastructure/config/security.constants';

// biome-ignore lint/style/useImportType: CreateAccessTokenCommand wird fuer Runtime-Typisierung benoetigt
import { CreateAccessTokenCommand } from './create-access-token.command';
// biome-ignore lint/style/useImportType: CreateAccessTokenResponseDto wird fuer Runtime-Typisierung benoetigt
import { CreateAccessTokenResponseDto } from '../dto/create-access-token-response.dto';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';
import { TOKEN_PREFIX, TOKEN_PREFIX_DISPLAY_LENGTH } from '../constants/token.constants';

/**
 * Handler zum Erstellen eines neuen Server-Access-Tokens.
 *
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 * Der Handler generiert einen neuen Token, hasht ihn mit bcrypt und speichert
 * den Hash in der Datenbank. Das Klartext-Token wird NUR in der Response
 * zurueckgegeben und kann spaeter NICHT erneut abgerufen werden.
 *
 * **Transaktionale Garantien:**
 * - ServerAccessToken wird in EINER Transaktion erstellt
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback
 *
 * **Security Considerations:**
 * - Token wird mit bcrypt (cost 10) gehasht (NFR-S1)
 * - Raw-Token wird NUR in Response zurueckgegeben, NICHT geloggt
 * - Audit-Trail loggt nur Token-Prefix (erste 12 Zeichen: blh_xxxxxxxx)
 * - Token-Format: blh_ + cuid2 (24 Zeichen) = 28 Zeichen total
 *
 * @example
 * ```typescript
 * const command = CreateAccessTokenCommand.create({
 *   name: 'CI/CD Pipeline Token',
 *   createdById: 'user_123',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.token); // blh_xxx... (nur hier sichtbar!)
 *   console.log(result.value.prefix); // blh_abc12345 (zur Identifikation)
 * }
 * ```
 */
@Injectable()
export class CreateAccessTokenHandler extends TransactionalCommandHandler<CreateAccessTokenCommand, CreateAccessTokenResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt die Token-Erstellung in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Generiere Token: blh_ + cuid2 (24 Zeichen) = 28 total
   * 2. Extrahiere Prefix (erste 12 Zeichen: blh_xxxxxxxx)
   * 3. Hashe Token mit bcrypt (Cost Factor 10)
   * 4. Erstelle ServerAccessToken Aggregate
   * 5. Speichere im Repository
   * 6. Logge Audit-Trail mit maskiertem Prefix (NICHT Raw-Token!)
   * 7. Sammle Domain Events
   *
   * @param command - Validiertes CreateAccessTokenCommand
   * @param tx - Transaction Context
   * @returns Success mit CreateAccessTokenResponseDto oder Failure
   */
  protected async executeInTransaction(
    command: CreateAccessTokenCommand,
    tx: TransactionContext,
  ): Promise<Result<CreateAccessTokenResponseDto> | { result: CreateAccessTokenResponseDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Token generieren: blh_ + cuid2 (24 Zeichen) = 28 total
    // ════════════════════════════════════════════════════════════════════════
    const rawToken = `${TOKEN_PREFIX}${createId()}`;

    // ════════════════════════════════════════════════════════════════════════
    // 2. Prefix extrahieren (erste 12 Zeichen: blh_xxxxxxxx)
    // Wird fuer Logging und spaetere Identifikation in Listen verwendet.
    // ════════════════════════════════════════════════════════════════════════
    const prefix = rawToken.substring(0, TOKEN_PREFIX_DISPLAY_LENGTH);

    // ════════════════════════════════════════════════════════════════════════
    // 3. bcrypt-Hash mit Cost-Factor 10 erstellen (NFR-S1 compliant)
    // Fehler bei bcrypt (z.B. Memory Allocation) werden als Result.fail() behandelt.
    // ════════════════════════════════════════════════════════════════════════
    let tokenHashValue: string;
    try {
      tokenHashValue = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);
    } catch (bcryptError) {
      const errorMessage = bcryptError instanceof Error ? bcryptError.message : 'Unknown bcrypt error';
      this.logger.error(`bcrypt.hash() failed: ${errorMessage}`, 'CreateAccessTokenHandler');
      return Result.fail<CreateAccessTokenResponseDto>(ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. TokenHash Value Object erstellen (validiert bcrypt-Format)
    // ════════════════════════════════════════════════════════════════════════
    const tokenHashResult = TokenHash.create(tokenHashValue);
    if (tokenHashResult.isFailure || !tokenHashResult.value) {
      return Result.fail<CreateAccessTokenResponseDto>(tokenHashResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. ServerAccessToken Aggregate erstellen mit name
    // ════════════════════════════════════════════════════════════════════════
    const tokenResult = ServerAccessToken.create({
      tokenHash: tokenHashResult.value,
      name: command.name,
    });

    if (tokenResult.isFailure || !tokenResult.value) {
      return Result.fail<CreateAccessTokenResponseDto>(tokenResult.error ?? ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED);
    }

    const token = tokenResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 6. Speichern im Repository
    // ════════════════════════════════════════════════════════════════════════
    const saveResult = await this.tokenRepository.save(token, tx);
    if (saveResult.isFailure) {
      return Result.fail<CreateAccessTokenResponseDto>(saveResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. Audit-Log mit Token-Prefix (maskiert) - NICHT Raw-Token!
    // WICHTIG: Das Klartext-Token wird hier NIEMALS geloggt!
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(`Access token created: "${command.name}" (prefix: ${prefix}...)`);

    // ════════════════════════════════════════════════════════════════════════
    // 8. Domain Events sammeln
    // ServerAccessToken.create() hat bereits ServerAccessTokenCreatedEvent hinzugefuegt
    // ════════════════════════════════════════════════════════════════════════
    const events = token.getDomainEvents();
    token.clearDomainEvents();

    // ════════════════════════════════════════════════════════════════════════
    // 9. Response zusammenstellen mit Raw-Token (NUR hier sichtbar!)
    // ════════════════════════════════════════════════════════════════════════
    const response: CreateAccessTokenResponseDto = {
      token: rawToken, // ⚠️ EINMALIG! Wird nie wieder angezeigt!
      name: command.name,
      prefix,
      createdAt: token.createdAt.toISOString(),
    };

    return { result: response, events };
  }
}
