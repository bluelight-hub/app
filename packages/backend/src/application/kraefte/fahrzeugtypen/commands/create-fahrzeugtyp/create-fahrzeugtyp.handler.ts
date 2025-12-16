import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { FahrzeugtypDto } from '../../dto/fahrzeugtyp.dto';
import { FahrzeugtypQueryMapper } from '../../queries/fahrzeugtyp-query.mapper';
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '@domain/kraefte/common/fahrzeugtyp-error-codes';
import type { CreateFahrzeugtypCommand } from './create-fahrzeugtyp.command';

/**
 * Handler für CreateFahrzeugtypCommand.
 *
 * Erstellt einen neuen Fahrzeugtyp mit Uniqueness-Check für Code.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 *
 * **AC3 Compliance Note (NestJS Logger):**
 * Logger Import aus @nestjs/common ist im Application Layer akzeptiert, weil:
 * - Logger ist ein Infrastruktur-Utility ohne Business-Logik-Kopplung
 * - TransactionalCommandHandler Base Class verwendet bereits NestJS Logger
 * - Logger beeinflusst nicht die Testbarkeit (kann gemockt werden)
 * - Etabliertes Pattern im gesamten Codebase (konsistent mit Qualifikation-Modul)
 * - Alternative (Domain Logger Interface) wäre Over-Engineering für diesen Use Case
 */
@Injectable()
export class CreateFahrzeugtypHandler extends TransactionalCommandHandler<CreateFahrzeugtypCommand, FahrzeugtypDto> {
  protected readonly logger = new Logger(CreateFahrzeugtypHandler.name);

  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly repository: IFahrzeugtypRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft Code VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   */
  protected async executeInTransaction(command: CreateFahrzeugtypCommand, tx: TransactionContext): Promise<Result<{ result: FahrzeugtypDto; events: DomainEvent[] }>> {
    // 1. Check Uniqueness: Code (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.repository.findByCode(command.code, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findByCode returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (existingResult.value) {
      return Result.fail(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.CODE_DUPLICATE, `Code '${command.code}' ist bereits vergeben`));
    }

    // 2. Create Aggregate
    const aggregateResult = Fahrzeugtyp.create({
      code: command.code,
      bezeichnung: command.bezeichnung,
      kategorie: command.kategorie,
      beschreibung: command.beschreibung,
      sollbesatzung: command.sollbesatzung,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure) {
      if (!aggregateResult.error) {
        this.logger.error('Fahrzeugtyp.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate creation returned failure without error message');
      }
      return Result.fail(aggregateResult.error);
    }

    if (!aggregateResult.value) {
      this.logger.error('Fahrzeugtyp.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Aggregate creation succeeded but value is null');
    }

    const fahrzeugtyp = aggregateResult.value;

    // 3. Save Aggregate in Transaction
    const saveResult = await this.repository.save(fahrzeugtyp, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 4. Extract Domain Events
    const events = fahrzeugtyp.getDomainEvents();
    fahrzeugtyp.clearDomainEvents();

    this.logger.log(`Fahrzeugtyp created: ${fahrzeugtyp.id.value} (${fahrzeugtyp.code})`);

    // 5. Map to DTO and return
    const dto = FahrzeugtypQueryMapper.toDto(fahrzeugtyp);
    return Result.ok({ result: dto, events });
  }
}
