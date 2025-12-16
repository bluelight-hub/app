import { Inject, Injectable, Logger } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { FahrzeugtypDto } from '../../dto/fahrzeugtyp.dto';
import { FahrzeugtypQueryMapper } from '../../queries/fahrzeugtyp-query.mapper';
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '@domain/kraefte/common/fahrzeugtyp-error-codes';
import type { UpdateFahrzeugtypCommand } from './update-fahrzeugtyp.command';

/**
 * Handler für UpdateFahrzeugtypCommand.
 *
 * Aktualisiert einen bestehenden Fahrzeugtyp mit optionalem Uniqueness-Check
 * für geänderten Code. updatedBy wird automatisch gesetzt (Task 7).
 */
@Injectable()
export class UpdateFahrzeugtypHandler extends TransactionalCommandHandler<UpdateFahrzeugtypCommand, FahrzeugtypDto> {
  protected readonly logger = new Logger(UpdateFahrzeugtypHandler.name);

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
   * **Empty-Update Check (Task 7):**
   * - Aggregate.update() validiert, dass mindestens ein Feld geändert wurde
   * - Vermeidet unnötige DB-Writes bei leeren Updates
   */
  protected async executeInTransaction(command: UpdateFahrzeugtypCommand, tx: TransactionContext): Promise<Result<{ result: FahrzeugtypDto; events: DomainEvent[] }>> {
    // 1. Validate ID format
    const idResult = FahrzeugtypId.create(command.id);
    if (idResult.isFailure) {
      if (!idResult.error) {
        this.logger.error('FahrzeugtypId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('ID validation returned failure without error message');
      }
      return Result.fail(idResult.error);
    }
    const fahrzeugtypId = idResult.value;
    if (!fahrzeugtypId) {
      this.logger.error('FahrzeugtypId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('ID validation succeeded but value is null');
    }

    // 2. Load existing Fahrzeugtyp
    const existingResult = await this.repository.findById(fahrzeugtypId, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('Repository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (!existingResult.value) {
      return Result.fail(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.NOT_FOUND, `Fahrzeugtyp mit ID '${command.id}' nicht gefunden`));
    }

    const fahrzeugtyp = existingResult.value;

    // 3. Check Uniqueness: Code (wenn geändert)
    // HINWEIS: TOCTOU Race Condition akzeptiert
    // - Pre-Check (findByCode) und save() sind nicht atomar
    // - Zwischen Check und Save kann ein anderer Request den gleichen Code erstellen
    // - ABER: Prisma Unique Constraint (P2002) fängt Race Condition ab
    // - save() wird mit Result.fail('Der Code "..." ist bereits vergeben.') fehlschlagen
    // - Pre-Check verbessert nur UX (sofortiges Feedback statt DB-Roundtrip)
    // - Race Window ist extrem klein (<100ms) in einer Single-Admin-Anwendung
    if (command.code && command.code !== fahrzeugtyp.code) {
      const duplicateResult = await this.repository.findByCode(command.code, tx);
      if (duplicateResult.isFailure) {
        if (!duplicateResult.error) {
          this.logger.error('Repository.findByCode returned isFailure=true but error is null - this is a bug!');
          throw new Error('Repository returned failure without error message');
        }
        return Result.fail(duplicateResult.error);
      }
      if (duplicateResult.value) {
        return Result.fail(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.CODE_DUPLICATE, `Code '${command.code}' ist bereits vergeben`));
      }
    }

    // 4. Update Aggregate (updatedBy wird automatisch gesetzt)
    const updateResult = fahrzeugtyp.update({
      code: command.code,
      bezeichnung: command.bezeichnung,
      kategorie: command.kategorie,
      beschreibung: command.beschreibung,
      sollbesatzung: command.sollbesatzung,
      istAktiv: command.istAktiv,
      updatedBy: command.updatedBy,
    });

    if (updateResult.isFailure) {
      if (!updateResult.error) {
        this.logger.error('Fahrzeugtyp.update returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate update returned failure without error message');
      }
      return Result.fail(updateResult.error);
    }

    // 5. Save Aggregate in Transaction
    const saveResult = await this.repository.save(fahrzeugtyp, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('Repository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 6. Extract Domain Events
    const events = fahrzeugtyp.getDomainEvents();
    fahrzeugtyp.clearDomainEvents();

    this.logger.log(`Fahrzeugtyp updated: ${fahrzeugtyp.id.value}`);

    // 7. Map to DTO and return
    const dto = FahrzeugtypQueryMapper.toDto(fahrzeugtyp);
    return Result.ok({ result: dto, events });
  }
}
