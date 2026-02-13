import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
import { StammFahrzeug } from '@domain/kraefte/aggregates/stamm-fahrzeug.aggregate';
import { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { StammFahrzeugDto } from '../../dto';
import { StammFahrzeugQueryMapper } from '../../queries/stamm-fahrzeug-query.mapper';
import { STAMM_FAHRZEUG_ERROR_CODES, StammFahrzeugError } from '@domain/kraefte/common/stamm-fahrzeug-error-codes';
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '@domain/kraefte/common/fahrzeugtyp-error-codes';
import type { CreateStammFahrzeugCommand } from './create-stamm-fahrzeug.command';

/**
 * Handler für CreateStammFahrzeugCommand.
 *
 * Erstellt ein neues Stamm-Fahrzeug mit Uniqueness-Check für Funkrufname.
 * Nutzt TransactionalCommandHandler für atomare Persistierung mit Outbox.
 *
 * **AC3 Compliance Note (NestJS Logger):**
 * Logger Import aus @nestjs/common ist im Application Layer akzeptiert, weil:
 * - Logger ist ein Infrastruktur-Utility ohne Business-Logik-Kopplung
 * - TransactionalCommandHandler Base Class verwendet bereits NestJS Logger
 * - Logger beeinflusst nicht die Testbarkeit (kann gemockt werden)
 * - Etabliertes Pattern im gesamten Codebase (konsistent mit Fahrzeugtyp-Modul)
 * - Alternative (Domain Logger Interface) wäre Over-Engineering für diesen Use Case
 *
 * **Fahrzeugtyp Validation:**
 * - Handler prüft ob fahrzeugtypId existiert VOR Aggregate-Erstellung
 * - Verhindert Foreign Key Constraint Violations mit frühem Feedback
 * - Repository save() würde P2003 Error werfen bei ungültiger fahrzeugtypId
 * - Pre-Check verbessert UX (sofortiges Feedback statt DB-Roundtrip)
 */
@Injectable()
export class CreateStammFahrzeugHandler extends TransactionalCommandHandler<CreateStammFahrzeugCommand, StammFahrzeugDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(LOGGER) protected readonly logger: ILogger,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG)
    private readonly stammFahrzeugRepository: IStammFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Uniqueness Check - UX Optimization:**
   * - Handler prüft funkrufname VOR Aggregate-Erstellung (early return für bessere UX)
   * - Datenbank hat ZUSÄTZLICH Unique Constraint (P2002 als autoritative Quelle)
   * - Race Condition möglich: Zwischen Check und Save könnte parallel Insert erfolgen
   * - ABER: DB Constraint fängt Race Condition ab → Repository save() gibt Result.fail bei P2002
   * - Redundanz ist GEWOLLT: Handler-Check = UX, DB-Constraint = Korrektheit
   *
   * **Fahrzeugtyp Validation:**
   * - Handler prüft ob fahrzeugtypId existiert (Foreign Key Pre-Check)
   * - Verhindert P2003 Foreign Key Constraint Violation mit frühem Feedback
   * - Lädt Fahrzeugtyp für Response-DTO Mapping (joined relation)
   *
   * **Response DTO Mapping:**
   * - StammFahrzeugDto benötigt FahrzeugtypDto (nested relation)
   * - Handler lädt Fahrzeugtyp in gleicher Transaction für konsistente Daten
   * - StammFahrzeugQueryMapper.toDto(aggregate, fahrzeugtyp) mapped beide
   */
  protected async executeInTransaction(command: CreateStammFahrzeugCommand, tx: TransactionContext): Promise<Result<StammFahrzeugDto> | { result: StammFahrzeugDto; events: DomainEvent[] }> {
    // 1. Validate Fahrzeugtyp ID format
    const fahrzeugtypIdResult = FahrzeugtypId.create(command.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure) {
      if (!fahrzeugtypIdResult.error) {
        this.logger.error('FahrzeugtypId.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Fahrzeugtyp ID validation returned failure without error message');
      }
      return Result.fail(fahrzeugtypIdResult.error);
    }
    const fahrzeugtypId = fahrzeugtypIdResult.value;
    if (!fahrzeugtypId) {
      this.logger.error('FahrzeugtypId.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Fahrzeugtyp ID validation succeeded but value is null');
    }

    // 2. Check Fahrzeugtyp exists (Foreign Key Pre-Check for better UX)
    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypId, tx);
    if (fahrzeugtypResult.isFailure) {
      if (!fahrzeugtypResult.error) {
        this.logger.error('FahrzeugtypRepository.findById returned isFailure=true but error is null - this is a bug!');
        throw new Error('Fahrzeugtyp repository returned failure without error message');
      }
      return Result.fail(fahrzeugtypResult.error);
    }
    if (!fahrzeugtypResult.value) {
      return Result.fail(FahrzeugtypError.format(FAHRZEUGTYP_ERROR_CODES.NOT_FOUND, `Fahrzeugtyp mit ID '${command.fahrzeugtypId}' nicht gefunden`));
    }
    const fahrzeugtyp = fahrzeugtypResult.value;

    // 3. Check Uniqueness: funkrufname (UX Optimization, DB Constraint ist autoritative Quelle)
    const existingResult = await this.stammFahrzeugRepository.findByFunkrufname(command.funkrufname, tx);
    if (existingResult.isFailure) {
      if (!existingResult.error) {
        this.logger.error('StammFahrzeugRepository.findByFunkrufname returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository returned failure without error message');
      }
      return Result.fail(existingResult.error);
    }
    if (existingResult.value) {
      return Result.fail(StammFahrzeugError.format(STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE, `Funkrufname '${command.funkrufname}' ist bereits vergeben`));
    }

    // 4. Create Aggregate
    const aggregateResult = StammFahrzeug.create({
      rufname: command.rufname,
      funkrufname: command.funkrufname,
      fahrzeugtypId: command.fahrzeugtypId,
      kennzeichen: command.kennzeichen,
      baujahr: command.baujahr,
      funkkenungBOS: command.funkkenungBOS,
      createdBy: command.createdBy,
    });

    if (aggregateResult.isFailure) {
      if (!aggregateResult.error) {
        this.logger.error('StammFahrzeug.create returned isFailure=true but error is null - this is a bug!');
        throw new Error('Aggregate creation returned failure without error message');
      }
      return Result.fail(aggregateResult.error);
    }

    if (!aggregateResult.value) {
      this.logger.error('StammFahrzeug.create returned isSuccess=true but value is null - this is a bug!');
      throw new Error('Aggregate creation succeeded but value is null');
    }

    const stammFahrzeug = aggregateResult.value;

    // 5. Save Aggregate in Transaction
    const saveResult = await this.stammFahrzeugRepository.save(stammFahrzeug, tx);
    if (saveResult.isFailure) {
      if (!saveResult.error) {
        this.logger.error('StammFahrzeugRepository.save returned isFailure=true but error is null - this is a bug!');
        throw new Error('Repository save returned failure without error message');
      }
      return Result.fail(saveResult.error);
    }

    // 6. Extract Domain Events
    const events = stammFahrzeug.getDomainEvents();
    stammFahrzeug.clearDomainEvents();

    this.logger.log(`StammFahrzeug created: ${stammFahrzeug.id.value} (${stammFahrzeug.funkrufname})`);

    // 7. Map to DTO and return (inkl. Fahrzeugtyp für nested DTO)
    const dto = StammFahrzeugQueryMapper.toDto(stammFahrzeug, fahrzeugtyp);
    return { result: dto, events };
  }
}
