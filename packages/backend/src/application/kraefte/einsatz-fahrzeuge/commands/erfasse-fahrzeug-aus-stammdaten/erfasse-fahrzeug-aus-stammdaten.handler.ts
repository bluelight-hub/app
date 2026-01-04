import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
// biome-ignore lint/style/useImportType: IEinsatzFahrzeugRepository needed for DI at runtime
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IStammFahrzeugRepository needed for DI at runtime
import { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
// biome-ignore lint/style/useImportType: IFahrzeugtypRepository needed for DI at runtime
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { StammFahrzeugId } from '@domain/kraefte/value-objects/stamm-fahrzeug-id';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzFahrzeugDto } from '../../dto';
import { EinsatzFahrzeugQueryMapper } from '../../queries/einsatz-fahrzeug-query.mapper';
import type { ErfasseFahrzeugAusStammdatenCommand } from './erfasse-fahrzeug-aus-stammdaten.command';

/**
 * Handler für ErfasseFahrzeugAusStammdatenCommand.
 *
 * Erfasst ein Fahrzeug aus Stammdaten für einen aktiven Einsatz.
 * Implementiert AC1-AC4 der Story 3-1.
 *
 * **AC1 - Stammdaten-Fahrzeug auswählen:**
 * - Handler lädt StammFahrzeug per stammId
 * - Prüft ob StammFahrzeug existiert und aktiv ist
 *
 * **AC2 - Snapshot Pattern:**
 * - KOPIERT funkrufname, kennzeichen, fahrzeugtypId vom StammFahrzeug
 * - Erstellt EinsatzFahrzeug mit Initial-FMS-Status 2 (Einsatzbereit)
 * - Emittiert FahrzeugErfasstEvent für ETB-Eintrag
 *
 * **AC3 - Atomare Event-Persistierung (Outbox Pattern):**
 * - TransactionalCommandHandler sichert atomare Persistierung
 * - Event wird in Outbox gespeichert, nicht direkt emittiert
 *
 * **AC4 - Duplikat-Validierung:**
 * - Prüft ob Funkrufname bereits im Einsatz existiert
 * - Verhindert Unique Constraint Violation mit frühem Feedback
 */
@Injectable()
export class ErfasseFahrzeugAusStammdatenHandler extends TransactionalCommandHandler<ErfasseFahrzeugAusStammdatenCommand, EinsatzFahrzeugDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_FAHRZEUG)
    private readonly stammFahrzeugRepository: IStammFahrzeugRepository,
    @Inject(KRAEFTE_REPOSITORIES.FAHRZEUGTYP)
    private readonly fahrzeugtypRepository: IFahrzeugtypRepository,
    @Inject(LOGGER)
    protected readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. StammFahrzeug laden und validieren
   * 2. Fahrzeugtyp laden für Response-DTO
   * 3. Duplikat-Check: Funkrufname bereits im Einsatz?
   * 4. EinsatzFahrzeug erstellen (Snapshot)
   * 5. Speichern in Transaction
   * 6. Domain Events extrahieren für Outbox
   */
  protected async executeInTransaction(
    command: ErfasseFahrzeugAusStammdatenCommand,
    tx: TransactionContext,
  ): Promise<Result<EinsatzFahrzeugDto> | { result: EinsatzFahrzeugDto; events: DomainEvent[] }> {
    // 1. Validate StammFahrzeug ID format
    const stammIdResult = StammFahrzeugId.create(command.stammId);
    if (stammIdResult.isFailure) {
      return Result.fail(stammIdResult.error ?? 'Ungültige StammFahrzeug ID');
    }
    const stammFahrzeugId = stammIdResult.value;
    if (!stammFahrzeugId) {
      this.logger.error('StammFahrzeugId.create returned success but value is null');
      throw new Error('StammFahrzeug ID validation succeeded but value is null');
    }

    // 2. Load StammFahrzeug
    const stammFahrzeugResult = await this.stammFahrzeugRepository.findById(stammFahrzeugId, tx);
    if (stammFahrzeugResult.isFailure) {
      return Result.fail(stammFahrzeugResult.error ?? 'Fehler beim Laden des StammFahrzeugs');
    }
    if (!stammFahrzeugResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.STAMM_NOT_FOUND, `StammFahrzeug mit ID '${command.stammId}' nicht gefunden`));
    }
    const stammFahrzeug = stammFahrzeugResult.value;

    // 3. Check if StammFahrzeug is archived (AC1: nur aktive Fahrzeuge)
    if (stammFahrzeug.archivedAt) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.STAMM_NOT_FOUND, `StammFahrzeug '${stammFahrzeug.funkrufname}' ist archiviert und kann nicht erfasst werden`));
    }

    // 4. Load Fahrzeugtyp for Response DTO
    const fahrzeugtypIdResult = FahrzeugtypId.create(stammFahrzeug.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure || !fahrzeugtypIdResult.value) {
      this.logger.error(`Invalid fahrzeugtypId in StammFahrzeug: ${stammFahrzeug.fahrzeugtypId}`);
      return Result.fail('StammFahrzeug enthält ungültige Fahrzeugtyp-ID');
    }
    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypIdResult.value, tx);
    if (fahrzeugtypResult.isFailure || !fahrzeugtypResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND, `Fahrzeugtyp mit ID '${stammFahrzeug.fahrzeugtypId}' nicht gefunden`));
    }
    const fahrzeugtyp = fahrzeugtypResult.value;

    // 5. Duplikat-Check: Funkrufname bereits im Einsatz? (AC4)
    const existsResult = await this.einsatzFahrzeugRepository.existsByEinsatzIdAndFunkrufname(command.einsatzId, stammFahrzeug.funkrufname, tx);
    if (existsResult.isFailure) {
      return Result.fail(existsResult.error ?? 'Fehler bei der Duplikat-Prüfung');
    }
    if (existsResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE, `Fahrzeug '${stammFahrzeug.funkrufname}' ist bereits im Einsatz erfasst`));
    }

    // 6. Create EinsatzFahrzeug Aggregate (Snapshot from StammFahrzeug) - AC2
    const aggregateResult = EinsatzFahrzeug.createFromStammdaten({
      einsatzId: command.einsatzId,
      stammId: command.stammId,
      fahrzeugtypId: stammFahrzeug.fahrzeugtypId,
      funkrufname: stammFahrzeug.funkrufname,
      kennzeichen: stammFahrzeug.kennzeichen,
      createdBy: command.createdBy,
      position: command.position,
    });

    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen des EinsatzFahrzeugs');
    }
    const einsatzFahrzeug = aggregateResult.value;

    // 7. Save Aggregate in Transaction
    const saveResult = await this.einsatzFahrzeugRepository.save(einsatzFahrzeug, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern des EinsatzFahrzeugs');
    }

    // 8. Extract Domain Events (für Outbox - AC3)
    const events = einsatzFahrzeug.getDomainEvents();
    einsatzFahrzeug.clearDomainEvents();

    this.logger.log(`EinsatzFahrzeug erfasst: ${einsatzFahrzeug.id.value} (${einsatzFahrzeug.funkrufname}) für Einsatz ${command.einsatzId}`);

    // 9. Map to DTO and return
    const dto = EinsatzFahrzeugQueryMapper.toDto(einsatzFahrzeug, fahrzeugtyp);
    return { result: dto, events };
  }
}
