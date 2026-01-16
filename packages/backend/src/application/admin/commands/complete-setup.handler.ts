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
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { InviteCode } from '@domain/aggregates/invite-code.aggregate';
// biome-ignore lint/style/useImportType: IOutboxRepository wird fuer NestJS DI benoetigt
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: IServerAccessTokenRepository wird fuer NestJS DI benoetigt
import { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
// biome-ignore lint/style/useImportType: IUserRepository wird fuer NestJS DI benoetigt
import { IUserRepository } from '@domain/repositories/i-user.repository';
// biome-ignore lint/style/useImportType: IInviteCodeRepository wird fuer NestJS DI benoetigt
import { IInviteCodeRepository } from '@domain/repositories/i-invite-code.repository';
import { TokenHash } from '@domain/value-objects/token-hash';
import { Username } from '@domain/value-objects/username';
import { UserRole } from '@domain/value-objects/user-role';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService wird zur Laufzeit fuer NestJS DI benoetigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { BCRYPT_COST_FACTOR_PASSWORD, BCRYPT_COST_FACTOR_TOKEN } from '@/infrastructure/config/security.constants';
// biome-ignore lint/style/useImportType: HibpService wird fuer NestJS DI benoetigt
import { HibpService } from '@/infrastructure/password/hibp.service';

// biome-ignore lint/style/useImportType: CompleteSetupCommand wird fuer Runtime-Typisierung benoetigt
import { CompleteSetupCommand } from './complete-setup.command';
// biome-ignore lint/style/useImportType: SetupResponseDto wird fuer Runtime-Typisierung benoetigt
import { SetupResponseDto } from '../dto/setup-response.dto';

/**
 * Token-Prefix fuer Server Access Tokens.
 * Format: blh_ + cuid2 (28 Zeichen total).
 */
const TOKEN_PREFIX = 'blh_';

/**
 * Default Token-Name fuer den initialen Setup-Token.
 */
const INITIAL_TOKEN_NAME = 'Initial Setup Token';

/**
 * Label fuer den initialen Invite-Code.
 */
const INITIAL_INVITE_LABEL = 'Initial Setup Invite';

/**
 * Maximale Nutzungen fuer den initialen Invite-Code.
 * Erlaubt genug Registrierungen fuer das erste Team.
 */
const INITIAL_INVITE_MAX_USES = 10;

/**
 * Gueltigkeit des initialen Invite-Codes in Tagen.
 */
const INITIAL_INVITE_EXPIRES_DAYS = 7;

/**
 * Handler fuer den initialen Server-Setup.
 *
 * Erstellt den ersten Admin-User, einen Server-Access-Token und
 * einen initialen Invite-Code in einer atomaren Transaktion.
 * Der Setup kann nur EINMAL durchgefuehrt werden - bei bereits
 * existierendem Admin wird ein Fehler zurueckgegeben.
 *
 * **Wichtig:** Admins haben Nutzername + Passwort.
 * Normale Nutzer haben NUR Nutzername (kein Passwort).
 *
 * **Transaktionale Garantien:**
 * - Admin-User, Token und Invite-Code werden in EINER Transaktion erstellt
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback aller Entities
 *
 * **Security Considerations (NIST SP 800-63B-4):**
 * - HIBP Breach Database Check vor Password-Hash
 * - Password wird mit bcrypt (cost 10) gehasht
 * - Token wird mit bcrypt (cost 10) gehasht
 * - Raw-Token wird NUR in Response zurueckgegeben, NICHT geloggt
 * - Audit-Trail loggt nur Token-Prefix (erste 7 Zeichen)
 * - Invite-Code wird maskiert im Log ausgegeben
 *
 * @example
 * ```typescript
 * const command = CompleteSetupCommand.create({
 *   username: 'admin',
 *   password: 'SecurePassword123!',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.accessToken.token); // blh_xxx... (nur hier sichtbar!)
 *   console.log(result.value.inviteCode.code);   // ABC12345 (fuer erste Registrierungen)
 * }
 * ```
 */
@Injectable()
export class CompleteSetupHandler extends TransactionalCommandHandler<CompleteSetupCommand, SetupResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(INVITE_CODE_REPOSITORY) private readonly inviteCodeRepository: IInviteCodeRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly hibpService: HibpService,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt den Setup in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Pruefe ob Admin bereits existiert (AC5)
   * 2. Erstelle Admin-User mit gehashtem Passwort
   * 3. Generiere und hashe Server-Access-Token
   * 4. Erstelle initialen Invite-Code fuer erste Registrierungen
   * 5. Speichere alle Aggregates
   * 6. Logge Audit-Trail mit maskiertem Token-Prefix (AC4)
   * 7. Sammle Domain Events
   *
   * @param command - Validiertes Setup-Command
   * @param tx - Transaction Context
   * @returns Success mit SetupResponseDto oder Failure
   */
  protected async executeInTransaction(command: CompleteSetupCommand, tx: TransactionContext): Promise<Result<SetupResponseDto> | { result: SetupResponseDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // AC5: Pruefe ob AKTIVER Admin bereits existiert (via Repository-Abstraction)
    // WICHTIG: countActiveByRoles prueft isActive=true UND isDeleted=false
    // Der SYSTEM-User (isActive=false) wird dadurch NICHT gezaehlt.
    // ════════════════════════════════════════════════════════════════════════
    const adminCountResult = await this.userRepository.countActiveByRoles(['ADMIN', 'SUPER_ADMIN'], tx);
    if (adminCountResult.isFailure || adminCountResult.value === undefined) {
      return Result.fail<SetupResponseDto>(adminCountResult.error ?? 'ADMIN_COUNT_FAILED');
    }

    if (adminCountResult.value > 0) {
      return Result.fail<SetupResponseDto>('SETUP_ALREADY_COMPLETED');
    }

    // ════════════════════════════════════════════════════════════════════════
    // NIST SP 800-63B-4: HIBP Breach Database Check (Optional aber empfohlen)
    // HINWEIS: Bei API-Fehlern wird NICHT blockiert (Graceful Degradation)
    // ════════════════════════════════════════════════════════════════════════
    const hibpResult = await this.hibpService.checkPassword(command.password);
    if (hibpResult.isCompromised) {
      this.logger.warn(`Password breach detected during setup: Password found in ${hibpResult.occurrences} known data breaches`);
      return Result.fail<SetupResponseDto>('PASSWORD_COMPROMISED');
    }
    if (hibpResult.error) {
      // Log warning but continue - HIBP is optional per NIST
      this.logger.warn(`HIBP check failed (continuing anyway): ${hibpResult.error}`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // Erstelle Admin-User
    // ════════════════════════════════════════════════════════════════════════

    // Username Value Object erstellen (bereits validiert im Command)
    const usernameResult = Username.create(command.username);
    if (usernameResult.isFailure || !usernameResult.value) {
      return Result.fail<SetupResponseDto>(usernameResult.error ?? 'USERNAME_CREATION_FAILED');
    }

    // UserAggregate erstellen
    const userResult = UserAggregate.create(usernameResult.value, UserRole.ADMIN());
    if (userResult.isFailure || !userResult.value) {
      return Result.fail<SetupResponseDto>(userResult.error ?? 'USER_CREATION_FAILED');
    }
    const user = userResult.value;

    // Password hashen mit type-safe Cost Factor (NFR-S1 compliant)
    const passwordHash = await bcrypt.hash(command.password, BCRYPT_COST_FACTOR_PASSWORD);

    // User in Transaction speichern
    const saveUserResult = await this.userRepository.save(user, tx);
    if (saveUserResult.isFailure) {
      return Result.fail<SetupResponseDto>(saveUserResult.error ?? 'USER_SAVE_FAILED');
    }

    // Password-Hash via Repository-Abstraction speichern (nicht direkter Prisma-Zugriff)
    // WARUM: UserAggregate enthaelt KEIN passwordHash (Security by Design)
    const setPasswordResult = await this.userRepository.setPasswordHash(user.id, passwordHash, tx);
    if (setPasswordResult.isFailure) {
      return Result.fail<SetupResponseDto>(setPasswordResult.error ?? 'PASSWORD_HASH_SAVE_FAILED');
    }

    // ════════════════════════════════════════════════════════════════════════
    // AC3: Token-Generierung
    // ════════════════════════════════════════════════════════════════════════

    // Raw Token generieren: blh_ + cuid2
    const rawToken = `${TOKEN_PREFIX}${createId()}`;

    // Token hashen mit type-safe Cost Factor (NFR-S1 compliant)
    const tokenHashValue = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);

    // TokenHash Value Object erstellen
    const tokenHashResult = TokenHash.create(tokenHashValue);
    if (tokenHashResult.isFailure || !tokenHashResult.value) {
      return Result.fail<SetupResponseDto>(tokenHashResult.error ?? 'Token-Hash konnte nicht erstellt werden');
    }

    // ServerAccessToken Aggregate erstellen
    const tokenResult = ServerAccessToken.create({
      tokenHash: tokenHashResult.value,
      name: INITIAL_TOKEN_NAME,
    });
    if (tokenResult.isFailure || !tokenResult.value) {
      return Result.fail<SetupResponseDto>(tokenResult.error ?? 'Token konnte nicht erstellt werden');
    }
    const token = tokenResult.value;

    // Token speichern
    const saveTokenResult = await this.tokenRepository.save(token, tx);
    if (saveTokenResult.isFailure) {
      return Result.fail<SetupResponseDto>(saveTokenResult.error ?? 'Token konnte nicht gespeichert werden');
    }

    // ════════════════════════════════════════════════════════════════════════
    // Erstelle initialen Invite-Code fuer erste Registrierungen
    // WARUM: Ohne Invite-Code koennen sich keine Nutzer registrieren.
    // Der Code wird beim Setup automatisch erstellt, damit das erste Team
    // sofort mit der Nutzung beginnen kann.
    // ════════════════════════════════════════════════════════════════════════

    // Berechne Ablaufdatum: heute + 7 Tage
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INITIAL_INVITE_EXPIRES_DAYS);

    // InviteCode Aggregate erstellen
    const inviteCodeResult = InviteCode.create({
      expiresAt,
      maxUses: INITIAL_INVITE_MAX_USES,
      createdById: user.id.value,
      label: INITIAL_INVITE_LABEL,
    });
    if (inviteCodeResult.isFailure || !inviteCodeResult.value) {
      return Result.fail<SetupResponseDto>(inviteCodeResult.error ?? 'INVITE_CODE_CREATION_FAILED');
    }
    const inviteCode = inviteCodeResult.value;

    // InviteCode speichern
    const saveInviteResult = await this.inviteCodeRepository.save(inviteCode, tx);
    if (saveInviteResult.isFailure) {
      return Result.fail<SetupResponseDto>(saveInviteResult.error ?? 'INVITE_CODE_SAVE_FAILED');
    }

    // ════════════════════════════════════════════════════════════════════════
    // Audit-Trail mit maskiertem Token-Prefix, User-Kontext und Invite-Code
    // ════════════════════════════════════════════════════════════════════════
    const tokenPrefix = rawToken.substring(0, 7);
    this.logger.log(
      `Server setup completed. Admin user '${command.username}' (ID: ${user.id.value}) created ` +
        `with initial access token (prefix: ${tokenPrefix}...) and invite code (${inviteCode.code.toMasked()}, maxUses: ${INITIAL_INVITE_MAX_USES}, expires: ${expiresAt.toISOString().split('T')[0]})`,
    );

    // ════════════════════════════════════════════════════════════════════════
    // Domain Events sammeln
    // ════════════════════════════════════════════════════════════════════════
    const userEvents = user.getDomainEvents();
    const tokenEvents = token.getDomainEvents();
    const inviteEvents = inviteCode.getDomainEvents();
    const allEvents = [...userEvents, ...tokenEvents, ...inviteEvents];

    // Events clearen (da sie jetzt zur Outbox gehen)
    user.clearDomainEvents();
    token.clearDomainEvents();
    inviteCode.clearDomainEvents();

    // ════════════════════════════════════════════════════════════════════════
    // Response zusammenstellen
    // ════════════════════════════════════════════════════════════════════════
    const response: SetupResponseDto = {
      user: {
        id: user.id.value,
        username: command.username,
        role: 'ADMIN',
      },
      accessToken: {
        token: rawToken, // ⚠️ EINMALIG! Wird nie wieder angezeigt!
        name: INITIAL_TOKEN_NAME,
        createdAt: new Date().toISOString(),
      },
      inviteCode: {
        code: inviteCode.code.value,
        expiresAt: expiresAt.toISOString(),
        maxUses: INITIAL_INVITE_MAX_USES,
        label: INITIAL_INVITE_LABEL,
      },
    };

    return { result: response, events: allEvents };
  }
}
