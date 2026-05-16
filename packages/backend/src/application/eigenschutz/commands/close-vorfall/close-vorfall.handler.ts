import type { ILogger } from '@domain/ports/i-logger.port';
import type { TransactionContext } from '@domain/common';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import { VORFALL_BEREITS_GESCHLOSSEN } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { CommandHandler } from '@nestjs/cqrs';
import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EIGENSCHUTZ_VORFALL_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { CloseVorfallCommand } from './close-vorfall.command';

export const CLOSE_VORFALL_ERROR_CODES = {
  VORFALL_NOT_FOUND: 'NotFound:Vorfall',
  BEREITS_GESCHLOSSEN: VORFALL_BEREITS_GESCHLOSSEN,
  BEGRUENDUNG_INVALID: 'ValidationFailed:Begruendung',
} as const;

const BEGRUENDUNG_MAX = 500;

/**
 * Handler für `CloseVorfallCommand` (Issue #415).
 *
 * Transactional Flow (Pattern Story 4.1 `AufloeseSicherungspostenHandler`):
 * 1. Validation: Begründung (optional) auf Länge prüfen.
 * 2. Aggregate laden, Cross-Einsatz-Defense.
 * 3. `close()` auf Aggregate → emittiert `VorfallGeschlossenEvent`. Idempotent
 *    gegen Doppelklick (zweiter Aufruf liefert `BusinessRule:VorfallBereitsGeschlossen`).
 * 4. Repo `updateClosure` persistiert die drei Closure-Felder. Defense-in-Depth
 *    auf DB-Ebene: WHERE filtert `geschlossenAm IS NULL`.
 * 5. Base-Handler persistiert Events atomar via Outbox.
 *
 * **Caller-Authorization:** läuft im Controller-Layer (Pattern Story 5.1).
 */
@Injectable()
@CommandHandler(CloseVorfallCommand)
export class CloseVorfallHandler extends TransactionalCommandHandler<CloseVorfallCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: CloseVorfallCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // Begründung ist optional; Empty-String → null (Aggregate-Vertrag).
    let normalizedBegruendung: string | null = null;
    if (command.begruendung !== null && command.begruendung !== undefined) {
      if (typeof command.begruendung !== 'string') {
        return Result.fail<string>(CLOSE_VORFALL_ERROR_CODES.BEGRUENDUNG_INVALID);
      }
      const trimmed = command.begruendung.trim();
      if (trimmed.length > BEGRUENDUNG_MAX) {
        return Result.fail<string>(CLOSE_VORFALL_ERROR_CODES.BEGRUENDUNG_INVALID);
      }
      normalizedBegruendung = trimmed.length === 0 ? null : trimmed;
    }

    const loadResult = await this.vorfallRepo.findById(command.vorfallId, tx);
    if (loadResult.isFailure) {
      return Result.fail<string>(`InfrastructureError:${loadResult.error ?? 'Vorfall konnte nicht geladen werden'}`);
    }
    const aggregate = loadResult.value;
    if (!aggregate || aggregate.einsatzId !== command.einsatzId) {
      return Result.fail<string>(CLOSE_VORFALL_ERROR_CODES.VORFALL_NOT_FOUND);
    }

    const closeResult = aggregate.close(command.userId, normalizedBegruendung);
    if (closeResult.isFailure) {
      const error = closeResult.error ?? 'Schließen fehlgeschlagen';
      if (error === VORFALL_BEREITS_GESCHLOSSEN) {
        return Result.fail<string>(VORFALL_BEREITS_GESCHLOSSEN);
      }
      // Aggregate-Validation (z. B. Begründung > 500 Zeichen, falls die
      // Trim-Logik im Application-Layer umgangen wird) endet hier.
      return Result.fail<string>(`ValidationFailed:Aggregate:${error}`);
    }

    const saveResult = await this.vorfallRepo.updateClosure(aggregate, tx);
    if (saveResult.isFailure) {
      const saveError = saveResult.error ?? 'Vorfall-Schließung fehlgeschlagen';
      if (saveError === VORFALL_BEREITS_GESCHLOSSEN) {
        return Result.fail<string>(VORFALL_BEREITS_GESCHLOSSEN);
      }
      return Result.fail<string>(`InfrastructureError:${saveError}`);
    }

    this.logger.log('Eigenschutz-Vorfall geschlossen', {
      vorfallId: aggregate.id.value,
      einsatzId: command.einsatzId,
      hasBegruendung: normalizedBegruendung !== null,
    });
    return { result: aggregate.id.value, events: aggregate.getDomainEvents() };
  }
}
