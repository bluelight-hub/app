import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { SICHERUNGSPOSTEN_BEREITS_AUFGELOEST, SICHERUNGSPOSTEN_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository } from '@domain/eigenschutz/repositories';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { AufloeseSicherungspostenCommand } from './aufloese-sicherungsposten.command';

export const AUFLOESE_SICHERUNGSPOSTEN_ERROR_CODES = {
  POSTEN_NOT_FOUND: 'NotFound:Sicherungsposten',
  CONFLICT_DETECTED: SICHERUNGSPOSTEN_CONFLICT_DETECTED,
  BEREITS_AUFGELOEST: SICHERUNGSPOSTEN_BEREITS_AUFGELOEST,
  BEGRUENDUNG_INVALID: 'ValidationFailed:Begruendung',
} as const;

const BEGRUENDUNG_MIN = 1;
const BEGRUENDUNG_MAX = 2000;

function encodeConflictSentinel(currentVersion: number): string {
  return `${SICHERUNGSPOSTEN_CONFLICT_DETECTED}:current=${currentVersion}`;
}

/**
 * Handler für `AufloeseSicherungspostenCommand` (Story 4.1, AC6+AC8).
 *
 * Validiert die Begründung VOR dem Aggregate-Aufruf (Application-Layer-
 * Validation, Pattern Story 3.6 `MeldeLueckeCommand`). Aggregate ist
 * idempotent — zweiter Aufruf bei aufgelöstem Posten liefert
 * `BusinessRule:BereitsAufgeloest` (Controller → 422).
 */
@Injectable()
@CommandHandler(AufloeseSicherungspostenCommand)
export class AufloeseSicherungspostenHandler extends TransactionalCommandHandler<AufloeseSicherungspostenCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERUNGSPOSTEN_REPOSITORY)
    private readonly postenRepo: ISicherungspostenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: AufloeseSicherungspostenCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    const trimmed = command.begruendung?.trim() ?? '';
    if (trimmed.length < BEGRUENDUNG_MIN || trimmed.length > BEGRUENDUNG_MAX) {
      return Result.fail<string>(AUFLOESE_SICHERUNGSPOSTEN_ERROR_CODES.BEGRUENDUNG_INVALID);
    }

    const loadResult = await this.postenRepo.findById(command.postenId, tx);
    if (loadResult.isFailure) {
      return Result.fail<string>(`InfrastructureError:${loadResult.error ?? 'Sicherungsposten konnte nicht geladen werden'}`);
    }
    const aggregate = loadResult.value;
    if (!aggregate || aggregate.einsatzId !== command.einsatzId) {
      return Result.fail<string>(AUFLOESE_SICHERUNGSPOSTEN_ERROR_CODES.POSTEN_NOT_FOUND);
    }

    const aufloeseResult = aggregate.aufloesen(command.userId, trimmed, command.expectedVersion);
    if (aufloeseResult.isFailure) {
      const error = aufloeseResult.error ?? 'Auflösen fehlgeschlagen';
      if (error === SICHERUNGSPOSTEN_CONFLICT_DETECTED) {
        return Result.fail<string>(encodeConflictSentinel(aggregate.version));
      }
      if (error === SICHERUNGSPOSTEN_BEREITS_AUFGELOEST) {
        return Result.fail<string>(SICHERUNGSPOSTEN_BEREITS_AUFGELOEST);
      }
      return Result.fail<string>(error);
    }

    const saveResult = await this.postenRepo.save(aggregate, command.userId, tx);
    if (saveResult.isFailure) {
      const saveError = saveResult.error ?? 'Sicherungsposten-Auflösen fehlgeschlagen';
      if (saveError === SICHERUNGSPOSTEN_CONFLICT_DETECTED) {
        const reload = await this.postenRepo.findById(command.postenId);
        if (reload.isSuccess && reload.value) {
          return Result.fail<string>(encodeConflictSentinel(reload.value.version));
        }
        return Result.fail<string>(SICHERUNGSPOSTEN_CONFLICT_DETECTED);
      }
      return Result.fail<string>(`InfrastructureError:${saveError}`);
    }

    this.logger.log('Sicherungsposten aufgelöst', {
      sicherungspostenId: aggregate.id.value,
      einsatzId: command.einsatzId,
      begruendungLength: trimmed.length,
    });
    return { result: aggregate.id.value, events: aggregate.getDomainEvents() };
  }
}
