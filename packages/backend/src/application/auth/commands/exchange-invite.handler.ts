import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createId } from '@paralleldrive/cuid2';
import { Result } from '@/domain/common/result';
import type { TransactionContext } from '@/domain/common/transaction';
import type { DomainEvent } from '@/domain/common/domain-event';
import type { IInviteCodeRepository } from '@/domain/repositories/i-invite-code.repository';
import type { IServerAccessTokenRepository } from '@/domain/repositories/i-server-access-token.repository';
import type { IOutboxRepository } from '@/domain/repositories/i-outbox.repository';
import { InviteCodeValue } from '@/domain/value-objects/invite-code-value';
import { TokenHash } from '@/domain/value-objects/token-hash';
import { ServerAccessToken } from '@/domain/aggregates/server-access-token.aggregate';
import { INVITE_CODE_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, OUTBOX_REPOSITORY } from '@/infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime (TransactionalCommandHandler constructor)
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
import type { ExchangeInviteDto } from './dto/exchange-invite.dto';
import type { ExchangeInviteResponseDto, ServerInfoDto } from './dto/exchange-invite-response.dto';

/**
 * Handler für Invite-Code Exchange.
 *
 * Orchestriert die Umwandlung eines gültigen Invite-Codes in ein Server-Access-Token.
 * Nutzt TransactionalCommandHandler für atomare Persistierung von Token und Invite-Code.
 *
 * **Implementiert alle 6 Acceptance Criteria:**
 * - AC1: Erfolgreicher Exchange mit Token-Generierung
 * - AC2: Ablauf-Validierung (expiresAt < now)
 * - AC3: Nutzungszähler-Validierung (usedCount >= maxUses)
 * - AC4: Existenz-Validierung (Code nicht gefunden)
 * - AC5: Rate-Limiting (im Controller via @Throttle)
 * - AC6: Atomare Invite-Markierung (Race-Condition-sicher via markAsUsedAtomic)
 *
 * **Business Flow:**
 * 1. Invite-Code Format-Validierung (8-stellig, alphanumerisch)
 * 2. Atomare Invite-Code-Markierung (Race-Condition-sicher!)
 * 3. Server-Access-Token Generierung (bcrypt Cost 10, ~100ms)
 * 4. Token-Persistierung mit Invite-Code-Referenz
 * 5. Transaction Commit (oder Rollback bei Fehler)
 *
 * **Security:**
 * - Bcrypt Cost Factor 10 gemäß NFR-S1 (verhindert Brute-Force)
 * - Plaintext-Token nur im Response sichtbar (nie persistiert)
 * - Token-Hash in DB (bcrypt $2a$ format, 60 Zeichen)
 * - Invite-Code wird atomar markiert (verhindert Double-Spend)
 *
 * **Race-Condition-Safety:**
 * - markAsUsedAtomic() nutzt Prisma updateMany mit conditional WHERE
 * - Atomic DB Operation: CHECK(useCount < maxUses) + INCREMENT(useCount)
 * - Zweiter paralleler Request findet kein Match mehr (count = 0)
 *
 * **Transaction Rollback Protection:**
 * - Invite-Code-Markierung und Token-Save in gleicher Transaction
 * - Bei Token-Save-Fehler: Invite-Code Rollback (User kann erneut versuchen)
 * - Verhindert Data Loss (Code verbraucht, aber kein Token generiert)
 *
 * **Performance:**
 * - bcrypt.hash(plainToken, 10) dauert ~100ms (akzeptabel für Exchange)
 * - Repository-Calls sequenziell innerhalb Transaction
 * - Atomare Invite-Markierung via DB-Transaktion
 *
 * @example
 * ```typescript
 * // Erfolgreicher Exchange
 * const dto = { inviteCode: 'ABC12345' };
 * const result = await handler.execute(dto);
 * if (result.isSuccess) {
 *   console.log(result.value.accessToken); // "blh_clx9k2j3m0000abc123xyz"
 *   console.log(result.value.serverInfo.name); // "Bluelight Hub"
 * }
 *
 * // Abgelaufener Code
 * const expired = await handler.execute({ inviteCode: 'EXPIRED1' });
 * // expired.error === 'INVITE_EXPIRED'
 *
 * // Bereits verwendeter Code (Race-Condition-safe!)
 * const used = await handler.execute({ inviteCode: 'USED1234' });
 * // used.error === 'INVITE_ALREADY_USED'
 * ```
 */
@Injectable()
export class ExchangeInviteHandler extends TransactionalCommandHandler<ExchangeInviteDto, ExchangeInviteResponseDto> {
  /** Bcrypt Cost Factor gemäß NFR-S1 (10 = ~100ms Hash-Zeit) */
  private static readonly BCRYPT_COST = 10;

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(INVITE_CODE_REPOSITORY)
    private readonly inviteRepo: IInviteCodeRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY)
    private readonly tokenRepo: IServerAccessTokenRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt Invite-Code Exchange innerhalb einer Transaktion aus.
   *
   * **Error Codes:**
   * - INVITE_CODE_EMPTY: Code ist leer
   * - INVITE_CODE_INVALID_LENGTH: Code hat nicht 8 Zeichen
   * - INVITE_CODE_INVALID_FORMAT: Code enthält ungültige Zeichen
   * - INVITE_INVALID: Code existiert nicht in DB
   * - INVITE_EXPIRED: Code ist abgelaufen (expiresAt < now)
   * - INVITE_ALREADY_USED: Code wurde bereits maximal oft verwendet (Race-Condition-safe!)
   * - DATABASE_ERROR: Unerwarteter DB-Fehler
   * - SERVER_ERROR: Interner Fehler (bcrypt, etc.)
   *
   * **Transaction Rollback Protection:**
   * Alle Operationen (Invite-Markierung + Token-Save) erfolgen in einer Transaction.
   * Bei Fehler wird alles zurückgerollt, User kann erneut versuchen.
   *
   * @param dto - ExchangeInviteDto mit inviteCode
   * @param tx - TransactionContext von TransactionalCommandHandler
   * @returns Result.fail() für Fehler ODER { result, events } für Success
   */
  protected async executeInTransaction(dto: ExchangeInviteDto, tx: TransactionContext): Promise<Result<ExchangeInviteResponseDto> | { result: ExchangeInviteResponseDto; events: DomainEvent[] }> {
    // Step 1: Validate Invite-Code Format
    const codeResult = InviteCodeValue.fromString(dto.inviteCode);
    if (codeResult.isFailure) {
      return Result.fail(codeResult.error ?? 'INVITE_CODE_INVALID_FORMAT');
    }
    const inviteCodeValue = codeResult.value;
    if (!inviteCodeValue) {
      return Result.fail('INVITE_CODE_INVALID_FORMAT');
    }

    // Step 2: AC6 - Atomare Invite-Markierung (Race-Condition-sicher!)
    // Diese Methode prüft Code-Validität (expired, used, revoked) atomar in der DB
    // und incrementiert useCount nur wenn alle Bedingungen erfüllt sind.
    const markResult = await this.inviteRepo.markAsUsedAtomic(inviteCodeValue, tx);
    if (markResult.isFailure) {
      // Error Codes: INVITE_ALREADY_USED, INVITE_INVALID, DATABASE_ERROR
      return Result.fail(markResult.error ?? 'INVITE_ALREADY_USED');
    }

    // Step 3: Generate Server-Access-Token (bcrypt Cost 10, ~100ms)
    const plainToken = `blh_${createId()}`; // z.B. "blh_clx9k2j3m0000abc123xyz"

    let tokenHashValue: TokenHash;
    try {
      // Bcrypt hash mit Cost 10 (NFR-S1 Security Requirement)
      const hashedToken = await bcrypt.hash(plainToken, ExchangeInviteHandler.BCRYPT_COST);

      // Validate TokenHash (prüft bcrypt Format + Cost Factor >= 10)
      const tokenHashResult = TokenHash.create(hashedToken);
      if (tokenHashResult.isFailure || !tokenHashResult.value) {
        return Result.fail('SERVER_ERROR');
      }
      tokenHashValue = tokenHashResult.value;
    } catch (_error) {
      // bcrypt.hash() kann theoretisch fehlschlagen
      return Result.fail('SERVER_ERROR');
    }

    // Step 4: Create ServerAccessToken Aggregate
    const tokenResult = ServerAccessToken.create({
      tokenHash: tokenHashValue,
      name: `Invite Exchange: ${inviteCodeValue.toMasked()}`,
      // expiresAt: null (Token läuft nie ab)
    });

    if (tokenResult.isFailure || !tokenResult.value) {
      return Result.fail('SERVER_ERROR');
    }

    const token = tokenResult.value;

    // Step 5: Persistiere ServerAccessToken in gleicher Transaction
    const saveTokenResult = await this.tokenRepo.save(token, tx);
    if (saveTokenResult.isFailure) {
      // DB Error beim Token-Save → Transaction Rollback
      // Invite-Code wird automatisch zurückgerollt (User kann erneut versuchen)
      return Result.fail('DATABASE_ERROR');
    }

    // Step 6: Extract Domain Events (falls vorhanden)
    const events = token.getDomainEvents ? token.getDomainEvents() : [];

    // Step 7: Populate ServerInfo aus Environment Variables
    const serverInfo: ServerInfoDto = {
      name: process.env.SERVER_NAME ?? 'Bluelight Hub',
      version: process.env.npm_package_version ?? '1.0.0',
      baseUrl: process.env.APP_URL ?? 'http://localhost:3091',
    };

    // Step 8: Return Response mit Plaintext-Token (nur einmal sichtbar!)
    const response: ExchangeInviteResponseDto = {
      accessToken: plainToken, // "blh_clx9k2j3m0000abc123xyz"
      serverInfo,
    };

    // Return plain object (NICHT Result.ok()!)
    // Base Handler wrapped dies automatisch in Result.ok()
    return { result: response, events };
  }
}
