import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { QualifikationDto } from '../../dto/qualifikation.dto';
import { QualifikationQueryMapper } from '../../queries/qualifikation-query.mapper';
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';
import type { UpdateQualifikationCommand } from './update-qualifikation.command';

/**
 * Handler für UpdateQualifikationCommand.
 *
 * Aktualisiert eine bestehende Qualifikation mit optionalem Uniqueness-Check
 * für geänderte Abkürzung.
 */
@Injectable()
export class UpdateQualifikationHandler extends TransactionalCommandHandler<UpdateQualifikationCommand, QualifikationDto> {
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
   */
  protected async executeInTransaction(command: UpdateQualifikationCommand, tx: TransactionContext): Promise<Result<QualifikationDto> | { result: QualifikationDto; events: DomainEvent[] }> {
    // 1. Validate ID format
    const idResult = QualifikationId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('QualifikationId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const qualifikationId = idResult.value;
    if (!qualifikationId) {
      this.logger.error('QualifikationId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing Qualifikation
    const existingResult = await this.repository.findById(qualifikationId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.NOT_FOUND, `Qualifikation mit ID '${command.id}' nicht gefunden`));
    }

    const qualifikation = existingResult.value;

    // 3. Check Uniqueness: Abkuerzung (wenn geändert)
    // HINWEIS: TOCTOU Race Condition akzeptiert
    // - Pre-Check (findByAbkuerzung) und save() sind nicht atomar
    // - Zwischen Check und Save kann ein anderer Request die gleiche Abkürzung erstellen
    // - ABER: Prisma Unique Constraint (P2002) fängt Race Condition ab
    // - save() wird mit Result.fail('Die Abkürzung "..." ist bereits vergeben.') fehlschlagen
    // - Pre-Check verbessert nur UX (sofortiges Feedback statt DB-Roundtrip)
    // - Race Window ist extrem klein (<100ms) in einer Single-Admin-Anwendung
    if (command.abkuerzung && command.abkuerzung !== qualifikation.abkuerzung) {
      const duplicateResult = await this.repository.findByAbkuerzung(command.abkuerzung, tx);
      if (duplicateResult.isFailure) {
        if (!duplicateResult.error) {
          this.logger.error('Repository.findByAbkuerzung returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository returned failure without error message');
        }
        return Result.fail(duplicateResult.error);
      }
      if (duplicateResult.value) {
        return Result.fail(QualifikationError.format(QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE, `Abkürzung '${command.abkuerzung}' ist bereits vergeben`));
      }
    }

    // 4. Update Aggregate
    const updateResult = qualifikation.update({
      name: command.name,
      abkuerzung: command.abkuerzung,
      kategorie: command.kategorie,
      beschreibung: command.beschreibung,
      istAktiv: command.istAktiv,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('Qualifikation.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 5. Save Aggregate in Transaction
    const saveResult = await this.repository.save(qualifikation, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 6. Extract Domain Events
    const events = qualifikation.getDomainEvents();
    qualifikation.clearDomainEvents();

    this.logger.log(`Qualifikation updated: ${qualifikation.id.value}`);

    // 7. Map to DTO and return
    const dto = QualifikationQueryMapper.toDto(qualifikation);
    return { result: dto, events };
  }
}
