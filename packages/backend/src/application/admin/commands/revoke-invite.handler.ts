import { Inject, Injectable, NotFoundException } from '@nestjs/common';

// biome-ignore lint/style/useImportType: DomainEvent wird fuer Runtime-Typisierung benoetigt
import { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
// biome-ignore lint/style/useImportType: TransactionContext wird fuer Runtime-Typisierung benoetigt
import { TransactionContext } from '@domain/common/transaction';
// biome-ignore lint/style/useImportType: ILogger wird fuer NestJS DI benoetigt
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: IOutboxRepository wird fuer NestJS DI benoetigt
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: IInviteCodeRepository wird fuer NestJS DI benoetigt
import { IInviteCodeRepository } from '@domain/repositories/i-invite-code.repository';
import { InviteCodeId } from '@domain/value-objects/invite-code-id';

import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService wird zur Laufzeit fuer NestJS DI benoetigt
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';

// biome-ignore lint/style/useImportType: RevokeInviteCommand wird fuer Runtime-Typisierung benoetigt
import { RevokeInviteCommand } from './revoke-invite.command';
// biome-ignore lint/style/useImportType: RevokeInviteResponseDto wird fuer Runtime-Typisierung benoetigt
import { RevokeInviteResponseDto } from '../dto/revoke-invite-response.dto';

/**
 * Handler zum Widerrufen eines Invite-Codes.
 *
 * Nutzt TransactionalCommandHandler fuer atomare Persistenz mit Outbox-Events.
 * Der Handler laedt den InviteCode, ruft revoke() auf und speichert die Aenderungen.
 *
 * **Transaktionale Garantien:**
 * - InviteCode wird in EINER Transaktion aktualisiert
 * - Domain Events werden atomar im Outbox gespeichert
 * - Bei Fehler: vollstaendiger Rollback
 *
 * **Idempotentes Verhalten:**
 * - Bereits widerrufene Codes: Kein erneutes Event, Success Response
 * - Bereits aufgebrauchte Codes (USED): Status bleibt USED, kein Event
 *
 * **Security Considerations:**
 * - Code wird in Logs maskiert (nur erste 4 Zeichen sichtbar)
 * - Audit-Trail loggt maskierten Code, ID und Admin-Email
 *
 * @example
 * ```typescript
 * const command = RevokeInviteCommand.create({
 *   inviteCodeId: 'inv_abc123def456ghi789jkl012',
 *   revokedById: 'user_admin123',
 * }).value!;
 *
 * const result = await handler.execute(command);
 * if (result.isSuccess) {
 *   console.log(result.value.status); // "revoked"
 * }
 * ```
 */
@Injectable()
export class RevokeInviteHandler extends TransactionalCommandHandler<RevokeInviteCommand, RevokeInviteResponseDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(INVITE_CODE_REPOSITORY) private readonly inviteCodeRepository: IInviteCodeRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Fuehrt den Invite-Code Widerruf in einer Transaktion aus.
   *
   * **Flow:**
   * 1. Validiere InviteCodeId Format
   * 2. Lade InviteCode aus Repository
   * 3. Wenn nicht gefunden: NotFoundException werfen
   * 4. Rufe revoke() auf dem Aggregate auf
   * 5. Speichere Aenderungen im Repository
   * 6. Logge Audit-Trail mit maskiertem Code
   * 7. Sammle Domain Events und gib sie zurueck
   *
   * @param command - Validiertes RevokeInviteCommand
   * @param tx - Transaction Context
   * @returns Success mit RevokeInviteResponseDto oder Failure
   */
  protected async executeInTransaction(command: RevokeInviteCommand, tx: TransactionContext): Promise<Result<RevokeInviteResponseDto> | { result: RevokeInviteResponseDto; events: DomainEvent[] }> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Validiere InviteCodeId Format
    // ════════════════════════════════════════════════════════════════════════
    const inviteCodeIdResult = InviteCodeId.create(command.inviteCodeId);
    if (inviteCodeIdResult.isFailure || !inviteCodeIdResult.value) {
      return Result.fail<RevokeInviteResponseDto>(inviteCodeIdResult.error ?? 'Ungueltige Invite-Code-ID');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Lade InviteCode aus Repository
    // ════════════════════════════════════════════════════════════════════════
    const findResult = await this.inviteCodeRepository.findById(inviteCodeIdResult.value, tx);

    if (findResult.isFailure) {
      return Result.fail<RevokeInviteResponseDto>(findResult.error ?? 'Fehler beim Laden des InviteCodes');
    }

    const inviteCode = findResult.value;

    // ════════════════════════════════════════════════════════════════════════
    // 3. Wenn nicht gefunden: NotFoundException werfen
    // ════════════════════════════════════════════════════════════════════════
    if (!inviteCode) {
      throw new NotFoundException(`Invite-Code mit ID ${command.inviteCodeId} nicht gefunden`);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Rufe revoke() auf dem Aggregate auf (idempotent)
    // ════════════════════════════════════════════════════════════════════════
    const revokeResult = inviteCode.revoke(command.revokedById);
    if (revokeResult.isFailure) {
      return Result.fail<RevokeInviteResponseDto>(revokeResult.error ?? 'Widerruf fehlgeschlagen');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. Speichere Aenderungen im Repository
    // ════════════════════════════════════════════════════════════════════════
    const saveResult = await this.inviteCodeRepository.save(inviteCode, tx);
    if (saveResult.isFailure) {
      return Result.fail<RevokeInviteResponseDto>(saveResult.error ?? 'Speichern fehlgeschlagen');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. Audit-Trail mit maskiertem Code und Admin-Kontext
    // ════════════════════════════════════════════════════════════════════════
    this.logger.log(`Invite code revoked (id: ${inviteCode.id.value}, code: ${inviteCode.code.toMasked()}, by: ${command.revokedById})`);

    // ════════════════════════════════════════════════════════════════════════
    // 7. Domain Events sammeln
    // ════════════════════════════════════════════════════════════════════════
    const events = inviteCode.getDomainEvents();
    inviteCode.clearDomainEvents();

    // ════════════════════════════════════════════════════════════════════════
    // 8. Response zusammenstellen
    // ════════════════════════════════════════════════════════════════════════
    const response: RevokeInviteResponseDto = {
      id: inviteCode.id.value,
      code: inviteCode.code.toMasked(),
      status: inviteCode.computeStatus(),
      revokedAt: inviteCode.revokedAt?.toISOString() ?? null,
    };

    return { result: response, events };
  }
}
