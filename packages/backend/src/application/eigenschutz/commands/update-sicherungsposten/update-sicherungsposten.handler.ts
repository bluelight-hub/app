import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { SICHERUNGSPOSTEN_BEREITS_AUFGELOEST, SICHERUNGSPOSTEN_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/sicherungsposten.aggregate';
import type { ISicherungspostenRepository } from '@domain/eigenschutz/repositories';
import { Standort } from '@domain/eigenschutz/value-objects/standort.vo';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY, SICHERUNGSPOSTEN_REPOSITORY } from '@infrastructure/di-tokens';
import { UpdateSicherungspostenCommand } from './update-sicherungsposten.command';

export const UPDATE_SICHERUNGSPOSTEN_ERROR_CODES = {
  POSTEN_NOT_FOUND: 'NotFound:Sicherungsposten',
  CONFLICT_DETECTED: SICHERUNGSPOSTEN_CONFLICT_DETECTED,
  BEREITS_AUFGELOEST: SICHERUNGSPOSTEN_BEREITS_AUFGELOEST,
  VALIDATION_FAILED_PREFIX: 'ValidationFailed',
  KEINE_AENDERUNG: 'BusinessRule:KeineAenderung',
} as const;

const RECOGNIZED_PREFIXES = ['NotFound:', 'BusinessRule:', 'ConflictDetected:', 'InfrastructureError:', 'ValidationFailed:'] as const;

function wrapError(error: string | undefined, fallback: string, prefix: string): string {
  const message = error ?? fallback;
  if (RECOGNIZED_PREFIXES.some((p) => message.startsWith(p))) return message;
  return `${prefix}:${message}`;
}

function encodeConflictSentinel(currentVersion: number): string {
  return `${SICHERUNGSPOSTEN_CONFLICT_DETECTED}:current=${currentVersion}`;
}

/**
 * Handler für `UpdateSicherungspostenCommand` (Story 4.1, AC6+AC8).
 *
 * Pattern 1:1 `UpdateGefaehrdungsbeurteilungItemsHandler` — Optimistic-
 * Concurrency-Sentinel `:current=<n>`-Suffix für 409-Mapping.
 */
@Injectable()
@CommandHandler(UpdateSicherungspostenCommand)
export class UpdateSicherungspostenHandler extends TransactionalCommandHandler<UpdateSicherungspostenCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(SICHERUNGSPOSTEN_REPOSITORY)
    private readonly postenRepo: ISicherungspostenRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: UpdateSicherungspostenCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    const loadResult = await this.postenRepo.findById(command.postenId, tx);
    if (loadResult.isFailure) {
      return Result.fail<string>(wrapError(loadResult.error, 'Sicherungsposten konnte nicht geladen werden', 'InfrastructureError'));
    }
    const aggregate = loadResult.value;
    if (!aggregate || aggregate.einsatzId !== command.einsatzId) {
      return Result.fail<string>(UPDATE_SICHERUNGSPOSTEN_ERROR_CODES.POSTEN_NOT_FOUND);
    }

    let standort: Standort | undefined;
    if (command.changes.standort !== undefined) {
      const standortResult = Standort.create(command.changes.standort);
      if (standortResult.isFailure || !standortResult.value) {
        return Result.fail<string>(`ValidationFailed:Standort:${standortResult.error ?? 'Standort ungültig'}`);
      }
      standort = standortResult.value;
    }

    const updateResult = aggregate.update(
      {
        ...(command.changes.bezeichnung !== undefined ? { bezeichnung: command.changes.bezeichnung } : {}),
        ...(standort !== undefined ? { standort } : {}),
        ...(command.changes.personal !== undefined ? { personal: command.changes.personal } : {}),
        ...(command.changes.einheitId !== undefined ? { einheitId: command.changes.einheitId } : {}),
        ...(command.changes.zustaendigkeitsbereich !== undefined ? { zustaendigkeitsbereich: command.changes.zustaendigkeitsbereich } : {}),
        ...(command.changes.abloesezeiten !== undefined ? { abloesezeiten: command.changes.abloesezeiten } : {}),
      },
      command.expectedVersion,
      command.userId,
    );
    if (updateResult.isFailure) {
      const error = updateResult.error ?? 'Update fehlgeschlagen';
      if (error === SICHERUNGSPOSTEN_CONFLICT_DETECTED) {
        return Result.fail<string>(encodeConflictSentinel(aggregate.version));
      }
      if (error === SICHERUNGSPOSTEN_BEREITS_AUFGELOEST) {
        return Result.fail<string>(SICHERUNGSPOSTEN_BEREITS_AUFGELOEST);
      }
      return Result.fail<string>(wrapError(error, 'Update fehlgeschlagen', 'ValidationFailed'));
    }

    const saveResult = await this.postenRepo.save(aggregate, command.userId, tx);
    if (saveResult.isFailure) {
      const saveError = saveResult.error ?? 'Sicherungsposten konnte nicht aktualisiert werden';
      if (saveError === SICHERUNGSPOSTEN_CONFLICT_DETECTED) {
        const reload = await this.postenRepo.findById(command.postenId);
        if (reload.isSuccess && reload.value) {
          return Result.fail<string>(encodeConflictSentinel(reload.value.version));
        }
        return Result.fail<string>(SICHERUNGSPOSTEN_CONFLICT_DETECTED);
      }
      return Result.fail<string>(wrapError(saveError, 'Sicherungsposten konnte nicht aktualisiert werden', 'InfrastructureError'));
    }

    this.logger.log('Sicherungsposten aktualisiert', {
      sicherungspostenId: aggregate.id.value,
      einsatzId: command.einsatzId,
      newVersion: aggregate.version,
    });
    return { result: aggregate.id.value, events: aggregate.getDomainEvents() };
  }
}
