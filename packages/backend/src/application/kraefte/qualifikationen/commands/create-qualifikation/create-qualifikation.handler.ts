import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../../queries/qualifikation-query.mapper';
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';
import type { CreateQualifikationCommand } from './create-qualifikation.command';

/**
 * Handler für CreateQualifikationCommand.
 *
 * Erstellt eine neue Qualifikation mit Uniqueness-Check für Abkürzung.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 */
@Injectable()
export class CreateQualifikationHandler extends TransactionalCommandHandler<CreateQualifikationCommand, QualifikationDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft Abkürzung VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   */
  protected async executeInTransaction(command: CreateQualifikationCommand, tx: TransactionContext): Promise<Result<QualifikationDto> | { result: QualifikationDto; events: DomainEvent[] }> {
    // 1. Check Uniqueness: Abkuerzung (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.repository.findByAbkuerzung(command.abkuerzung, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findByAbkuerzung returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (existingResult.value) {
      return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE, `Abkürzung '${command.abkuerzung}' ist bereits vergeben`));
    }

    // 2. Create Aggregate
    const aggregateResult = Qualifikation.create({
      name: command.name,
      abkuerzung: command.abkuerzung,
      kategorie: command.kategorie,
      beschreibung: command.beschreibung,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure) {
      if (!aggregateResult.error) {
        this.logger.error('Qualifikation.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate creation returned failure without error message');
      }
      return Result.fail(aggregateResult.error);
    }

    if (!aggregateResult.value) {
      this.logger.error('Qualifikation.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Aggregate creation succeeded but value is null');
    }

    const qualifikation = aggregateResult.value;

    // 3. Save Aggregate in Transaction
    const saveResult = await this.repository.save(qualifikation, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 4. Extract Domain Events
    const events = qualifikation.getDomainEvents();
    qualifikation.clearDomainEvents();

    this.logger.log(`Qualifikation created: ${qualifikation.id.value} (${qualifikation.abkuerzung})`);

    // 5. Map to DTO and return
    const dto = QualifikationQueryMapper.toDto(qualifikation);
    return { result: dto, events };
  }
}
