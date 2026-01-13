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
// biome-ignore lint/style/useImportType: IServerConfigRepository wird fuer NestJS DI benoetigt
import { IServerConfigRepository } from '@domain/repositories/i-server-config.repository';
import { TokenHash } from '@domain/value-objects/token-hash';
import { ServerMigratedToSecureModeEvent } from '@domain/events/server-migrated-to-secure-mode.event';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService wird zur Laufzeit fuer NestJS DI benoetigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, SERVER_CONFIG_REPOSITORY } from '@infrastructure/di-tokens';
import { BCRYPT_COST_FACTOR_TOKEN } from '@/infrastructure/config/security.constants';

// biome-ignore lint/style/useImportType: MigrateToSecureModeCommand wird fuer Runtime-Typisierung benoetigt
import { MigrateToSecureModeCommand } from './migrate-to-secure-mode.command';
// biome-ignore lint/style/useImportType: MigrateToSecureModeResponseDto wird fuer Runtime-Typisierung benoetigt
import { MigrateToSecureModeResponseDto } from '../dto/migrate-to-secure-mode.dto';
import { SECURITY_ERROR_CODES } from '../errors/security-error.codes';
import { ACCESS_TOKEN_ERROR_CODES } from '../errors/access-token-error.codes';
import { TOKEN_PREFIX, TOKEN_PREFIX_DISPLAY_LENGTH } from '../constants/token.constants';

/**
 * Handler zur Migration von INSECURE zu SECURE Mode.
 *
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 * Der Handler generiert ein Initial-Token, wechselt den Server-Modus und
 * speichert alles atomar in einer Transaktion.
 *
 * **Transaktionale Garantien:**
 * - ServerConfig.insecureMode wird auf false gesetzt
 * - ServerAccessToken (Initial-Token) wird erstellt
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback
 *
 * **Security Considerations:**
 * - Token wird mit bcrypt (cost 10) gehasht (NFR-S1)
 * - Raw-Token wird NUR in Response zurueckgegeben, NICHT geloggt
 * - Audit-Trail loggt nur Token-Prefix (erste 12 Zeichen)
 * - Migration ist IRREVERSIBEL - Server kann nicht zu INSECURE zurueck!
 *
 * **Pre-Conditions:**
 * - Server muss im INSECURE Mode sein (insecureMode = true)
 * - Keine aktiven Tokens erforderlich (es ist der erste Token)
 *
 * @example
 * ```typescript
 * const command = MigrateToSecureModeCommand.create({
 *   tokenName: 'Admin Initial Token',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.token); // blh_xxx... (nur hier sichtbar!)
 *   console.log(result.value.migratedAt); // 2026-01-13T10:30:00.000Z
 *   // Server ist jetzt im SECURE Mode!
 * }
 * ```
 */
@Injectable()
export class MigrateToSecureModeHandler extends TransactionalCommandHandler<MigrateToSecureModeCommand, MigrateToSecureModeResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SERVER_ACCESS_TOKEN_REPOSITORY) private readonly tokenRepository: IServerAccessTokenRepository,
    @Inject(SERVER_CONFIG_REPOSITORY) private readonly configRepository: IServerConfigRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt die Migration zu SECURE Mode in einer Transaktion aus.
   *
   * **Flow:**
   * 1. ServerConfig laden und pruefen ob insecureMode = true
   * 2. Token generieren: blh_ + cuid2 (24 Zeichen) = 28 total
   * 3. Extrahiere Prefix (erste 12 Zeichen)
   * 4. Hashe Token mit bcrypt (Cost Factor 10)
   * 5. Erstelle ServerAccessToken Aggregate
   * 6. Speichere Token im Repository
   * 7. Aktualisiere ServerConfig (insecureMode = false, migratedAt = now)
   * 8. Logge Audit-Trail mit maskiertem Prefix
   * 9. Sammle Domain Events
   *
   * @param command - Validiertes MigrateToSecureModeCommand
   * @param tx - Transaction Context
   * @returns Success mit MigrateToSecureModeResponseDto oder Failure
   */
  protected async executeInTransaction(
    command: MigrateToSecureModeCommand,
    tx: TransactionContext,
  ): Promise<Result<MigrateToSecureModeResponseDto> | { result: MigrateToSecureModeResponseDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. ServerConfig laden und pruefen
    // ════════════════════════════════════════════════════════════════════════
    const configResult = await this.configRepository.getOrCreate(tx);
    if (configResult.isFailure || !configResult.value) {
      this.logger.error(`Failed to load ServerConfig: ${configResult.error}`, 'MigrateToSecureModeHandler');
      return Result.fail<MigrateToSecureModeResponseDto>(SECURITY_ERROR_CODES.CONFIG_NOT_FOUND);
    }

    const config = configResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 2. Pruefen ob Server im INSECURE Mode ist
    // ════════════════════════════════════════════════════════════════════════
    if (!config.insecureMode) {
      this.logger.warn('Migration attempted but server is already in SECURE mode', 'MigrateToSecureModeHandler');
      return Result.fail<MigrateToSecureModeResponseDto>(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Token generieren: blh_ + cuid2 (24 Zeichen) = 28 total
    // ════════════════════════════════════════════════════════════════════════
    const rawToken = `${TOKEN_PREFIX}${createId()}`;

    // ════════════════════════════════════════════════════════════════════════
    // 4. Prefix extrahieren (erste 12 Zeichen: blh_xxxxxxxx)
    // ════════════════════════════════════════════════════════════════════════
    const prefix = rawToken.substring(0, TOKEN_PREFIX_DISPLAY_LENGTH);

    // ════════════════════════════════════════════════════════════════════════
    // 5. bcrypt-Hash mit Cost-Factor 10 erstellen (NFR-S1 compliant)
    // ════════════════════════════════════════════════════════════════════════
    let tokenHashValue: string;
    try {
      tokenHashValue = await bcrypt.hash(rawToken, BCRYPT_COST_FACTOR_TOKEN);
    } catch (bcryptError) {
      const errorMessage = bcryptError instanceof Error ? bcryptError.message : 'Unknown bcrypt error';
      this.logger.error(`bcrypt.hash() failed during migration: ${errorMessage}`, 'MigrateToSecureModeHandler');
      return Result.fail<MigrateToSecureModeResponseDto>(SECURITY_ERROR_CODES.TOKEN_GENERATION_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. TokenHash Value Object erstellen (validiert bcrypt-Format)
    // ════════════════════════════════════════════════════════════════════════
    const tokenHashResult = TokenHash.create(tokenHashValue);
    if (tokenHashResult.isFailure || !tokenHashResult.value) {
      return Result.fail<MigrateToSecureModeResponseDto>(tokenHashResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 7. ServerAccessToken Aggregate erstellen mit name
    // ════════════════════════════════════════════════════════════════════════
    const tokenResult = ServerAccessToken.create({
      tokenHash: tokenHashResult.value,
      name: command.tokenName,
    });

    if (tokenResult.isFailure || !tokenResult.value) {
      return Result.fail<MigrateToSecureModeResponseDto>(tokenResult.error ?? ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED);
    }

    const token = tokenResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 8. Speichern des Tokens im Repository
    // ════════════════════════════════════════════════════════════════════════
    const saveResult = await this.tokenRepository.save(token, tx);
    if (saveResult.isFailure) {
      return Result.fail<MigrateToSecureModeResponseDto>(saveResult.error ?? ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 9. ServerConfig aktualisieren (insecureMode = false, migratedAt = now)
    // ════════════════════════════════════════════════════════════════════════
    const migratedAt = new Date();
    const updateResult = await this.configRepository.update(
      {
        insecureMode: false,
        migratedAt,
      },
      tx,
    );

    if (updateResult.isFailure) {
      this.logger.error(`Failed to update ServerConfig: ${updateResult.error}`, 'MigrateToSecureModeHandler');
      return Result.fail<MigrateToSecureModeResponseDto>(SECURITY_ERROR_CODES.CONFIG_UPDATE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 10. Audit-Log mit Token-Prefix (maskiert) - NICHT Raw-Token!
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(`Server migrated to SECURE mode. Initial token created: "${command.tokenName}" (prefix: ${prefix}...)`);

    // ════════════════════════════════════════════════════════════════════════
    // 11. Domain Events sammeln
    // ServerAccessToken.create() hat bereits ServerAccessTokenCreatedEvent hinzugefuegt
    // Zusaetzlich: ServerMigratedToSecureModeEvent
    // ════════════════════════════════════════════════════════════════════════
    const tokenEvents = token.getDomainEvents();
    token.clearDomainEvents();

    // Migration Event hinzufuegen
    const migrationEvent = new ServerMigratedToSecureModeEvent(token.id, command.tokenName, migratedAt);

    const events: DomainEvent[] = [...tokenEvents, migrationEvent];

    // ════════════════════════════════════════════════════════════════════════
    // 12. Response zusammenstellen mit Raw-Token (NUR hier sichtbar!)
    // ════════════════════════════════════════════════════════════════════════
    const response: MigrateToSecureModeResponseDto = {
      success: true,
      previousMode: 'INSECURE',
      newMode: 'SECURE',
      token: rawToken, // ⚠️ EINMALIG! Wird nie wieder angezeigt!
      tokenName: command.tokenName,
      tokenPrefix: prefix,
      migratedAt: migratedAt.toISOString(),
    };

    return { result: response, events };
  }
}
