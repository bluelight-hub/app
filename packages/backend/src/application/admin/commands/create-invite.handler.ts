import { Inject, Injectable } from '@nestjs/common';
// biome-ignore lint/style/useImportType: ConfigService wird für NestJS DI benötigt
import { ConfigService } from '@nestjs/config';

// biome-ignore lint/style/useImportType: DomainEvent wird für Runtime-Typisierung benötigt
import { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: TransactionContext wird für Runtime-Typisierung benötigt
import { TransactionContext } from '@domain/common/transaction';
import { InviteCode } from '@domain/aggregates/invite-code.aggregate';
// biome-ignore lint/style/useImportType: ILogger wird für NestJS DI benötigt
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: IOutboxRepository wird für NestJS DI benötigt
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: IInviteCodeRepository wird für NestJS DI benötigt
import { IInviteCodeRepository } from '@domain/repositories/i-invite-code.repository';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService wird zur Laufzeit für NestJS DI benötigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

// biome-ignore lint/style/useImportType: CreateInviteCommand wird für Runtime-Typisierung benötigt
import { CreateInviteCommand } from './create-invite.command';
// biome-ignore lint/style/useImportType: CreateInviteResponseDto wird für Runtime-Typisierung benötigt
import { CreateInviteResponseDto } from '../dto/create-invite-response.dto';
import { INVITE_ERROR_CODES } from '../errors/invite-error.codes';

/**
 * Handler zum Erstellen eines neuen Invite-Codes.
 *
 * Nutzt TransactionalCommandHandler für atomare Persistenz mit Outbox-Events.
 * Der Handler erstellt einen neuen InviteCode, speichert ihn in der Datenbank
 * und gibt Deep-Link sowie Web-Link für die einfache Weitergabe zurück.
 *
 * **Transaktionale Garantien:**
 * - InviteCode wird in EINER Transaktion erstellt
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollständiger Rollback
 *
 * **Security Considerations:**
 * - Code wird in Logs maskiert (nur erste 4 Zeichen sichtbar)
 * - Raw-Code wird NUR in Response zurückgegeben
 * - Audit-Trail loggt maskierten Code und Admin-ID
 *
 * @example
 * ```typescript
 * const command = CreateInviteCommand.create({
 *   expiresAt: new Date('2026-01-10T18:00:00Z'),
 *   maxUses: 5,
 *   label: 'Einsatzkräfte Team Nord',
 *   createdById: 'user_123',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.code); // "ABC12345"
 *   console.log(result.value.deepLink); // "bluelight://connect?..."
 * }
 * ```
 */
@Injectable()
export class CreateInviteHandler extends TransactionalCommandHandler<CreateInviteCommand, CreateInviteResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(INVITE_CODE_REPOSITORY) private readonly inviteCodeRepository: IInviteCodeRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly configService: ConfigService,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Führt die Invite-Code Erstellung in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Erstelle InviteCode Aggregate (generiert 8-stelligen Code)
   * 2. Persistiere im Repository
   * 3. Generiere Deep-Link und Web-Link
   * 4. Logge Audit-Trail mit maskiertem Code
   * 5. Sammle Domain Events
   *
   * @param command - Validiertes CreateInviteCommand
   * @param tx - Transaction Context
   * @returns Success mit CreateInviteResponseDto oder Failure
   */
  protected async executeInTransaction(command: CreateInviteCommand, tx: TransactionContext): Promise<Result<CreateInviteResponseDto> | { result: CreateInviteResponseDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Erstelle InviteCode Aggregate (Code wird automatisch generiert)
    // ════════════════════════════════════════════════════════════════════════
    const inviteResult = InviteCode.create({
      expiresAt: command.expiresAt,
      maxUses: command.maxUses,
      label: command.label,
      createdById: command.createdById,
    });

    if (inviteResult.isFailure || !inviteResult.value) {
      return Result.fail<CreateInviteResponseDto>(inviteResult.error ?? INVITE_ERROR_CODES.CREATION_FAILED);
    }

    const invite = inviteResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 2. Persistiere im Repository
    // ════════════════════════════════════════════════════════════════════════
    const saveResult = await this.inviteCodeRepository.save(invite, tx);
    if (saveResult.isFailure) {
      return Result.fail<CreateInviteResponseDto>(saveResult.error ?? INVITE_ERROR_CODES.SAVE_FAILED);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Generiere Deep-Link und Web-Link für einfache Weitergabe
    // ════════════════════════════════════════════════════════════════════════
    const appUrl = this.configService.get<string>('APP_URL');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!appUrl || !frontendUrl) {
      this.logger.error('Missing required configuration: APP_URL or FRONTEND_URL. Cannot generate invite links.');
      return Result.fail<CreateInviteResponseDto>(INVITE_ERROR_CODES.CREATION_FAILED);
    }

    const code = invite.code.value;
    const expiresIso = invite.expiresAt.toISOString();

    // Deep Link für Tauri Desktop App
    // Format: bluelight://connect?url=<server>&invite=<code>&expires=<iso>
    const deepLink = `bluelight://connect?url=${encodeURIComponent(appUrl)}&invite=${code}&expires=${encodeURIComponent(expiresIso)}`;

    // Web Link für Browser
    // Format: <frontend>?server=<server>&invite=<code>
    const webLink = `${frontendUrl}?server=${encodeURIComponent(appUrl)}&invite=${code}`;

    // ════════════════════════════════════════════════════════════════════════
    // 4. Audit-Trail mit maskiertem Code und Admin-Kontext
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(`Invite code created (code: ${invite.code.toMasked()}, by: ${command.createdById}, expires: ${invite.expiresAt.toISOString().split('T')[0]}, maxUses: ${invite.maxUses})`);

    // ════════════════════════════════════════════════════════════════════════
    // 5. Domain Events sammeln
    // ════════════════════════════════════════════════════════════════════════
    const events = invite.getDomainEvents();
    invite.clearDomainEvents();

    // ════════════════════════════════════════════════════════════════════════
    // 6. Response zusammenstellen
    // ════════════════════════════════════════════════════════════════════════
    const response: CreateInviteResponseDto = {
      id: invite.id.value,
      code,
      expiresAt: expiresIso,
      maxUses: invite.maxUses,
      useCount: invite.usedCount,
      label: invite.label ?? undefined,
      createdAt: invite.createdAt.toISOString(),
      deepLink,
      webLink,
    };

    return { result: response, events };
  }
}
