import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
// biome-ignore lint/style/useImportType: IQualifikationRepository needed for DI at runtime
import { IQualifikationRepository } from '@domain/kraefte/repositories/i-qualifikation.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
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
 *
 * **AC3 Compliance Note (NestJS Logger):**
 * Logger Import aus @nestjs/common ist im Application Layer akzeptiert, weil:
 * - Logger ist ein Infrastruktur-Utility ohne Business-Logik-Kopplung
 * - TransactionalCommandHandler Base Class verwendet bereits NestJS Logger
 * - Logger beeinflusst nicht die Testbarkeit (kann gemockt werden)
 * - Etabliertes Pattern im gesamten Codebase (konsistent mit Einsatz-Modul)
 * - Alternative (Domain Logger Interface) wäre Over-Engineering für diesen Use Case
 */
@Injectable()
export class CreateQualifikationHandler extends TransactionalCommandHandler<CreateQualifikationCommand, QualifikationDto> {
  protected readonly logger = new Logger(CreateQualifikationHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.QUALIFIKATION)
    private readonly repository: IQualifikationRepository,
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
