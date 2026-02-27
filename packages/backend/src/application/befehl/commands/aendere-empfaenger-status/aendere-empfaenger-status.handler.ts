import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common';
import type { IBefehlRepository } from '@domain/repositories/i-befehl.repository';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { BEFEHL_REPOSITORY, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { BEFEHL_ERROR_CODES } from '@/application/befehl/errors/befehl-error.codes';
import { AendereEmpfaengerStatusCommand } from './aendere-empfaenger-status.command';

/**
 * Handler für AendereEmpfaengerStatusCommand mit Transactional Outbox Pattern.
 *
 * Unterstützt drei Aktionen:
 * - ZUSTELLEN: Markiert einen Empfänger als zugestellt
 * - QUITTIEREN: Quittiert stellvertretend für einen Empfänger
 * - ZURUECKSETZEN: Setzt den Empfänger-Status zurück
 */
@Injectable()
export class AendereEmpfaengerStatusHandler extends TransactionalCommandHandler<AendereEmpfaengerStatusCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(BEFEHL_REPOSITORY)
    private readonly befehlRepository: IBefehlRepository,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AendereEmpfaengerStatusCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. Validate BefehlId
    const befehlIdResult = BefehlId.create(command.befehlId);
    if (befehlIdResult.isFailure) {
      return Result.fail(befehlIdResult.error ?? 'Ungültige Befehl-ID');
    }
    const befehlId = befehlIdResult.value as BefehlId;

    // 2. Load Befehl from Repository
    const findResult = await this.befehlRepository.findById(befehlId, tx);
    if (findResult.isFailure) {
      return Result.fail(findResult.error ?? 'Fehler beim Laden des Befehls');
    }
    const befehl = findResult.value as Befehl | null;
    if (!befehl) {
      return Result.fail(BEFEHL_ERROR_CODES.NOT_FOUND);
    }

    // 3. Execute Domain Logic based on action
    let actionResult: Result<void>;

    switch (command.aktion) {
      case 'ZUSTELLEN':
        actionResult = befehl.manuellZustellen(command.empfaengerEntityId);
        break;
      case 'QUITTIEREN':
        if (!command.quittierungArt) {
          return Result.fail('quittierungArt ist erforderlich für Aktion QUITTIEREN');
        }
        actionResult = befehl.stellvertretendQuittieren(command.empfaengerEntityId, command.quittierungArt, command.kommentar);
        break;
      case 'ZURUECKSETZEN':
        if (!command.zielStatus) {
          return Result.fail('zielStatus ist erforderlich für Aktion ZURUECKSETZEN');
        }
        actionResult = befehl.empfaengerStatusZuruecksetzen(command.empfaengerEntityId, command.zielStatus);
        break;
      default:
        return Result.fail(`Ungültige Aktion: ${command.aktion}`);
    }

    if (actionResult.isFailure) {
      return Result.fail(actionResult.error ?? 'Aktion fehlgeschlagen');
    }

    // 4. Save Aggregate in Transaction
    const saveResult = await this.befehlRepository.save(befehl, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Speichern fehlgeschlagen');
    }

    // 5. Extract Domain Events für Outbox
    const events = befehl.getDomainEvents();

    return { result: befehl.id.value, events };
  }
}
