import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { IFahrzeugtypRepository } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzFahrzeugDto } from '../../dto';
import { EinsatzFahrzeugQueryMapper } from '@application/kraefte/einsatz-fahrzeuge';
import type { ErfasseTemporalesFahrzeugCommand } from './erfasse-temporales-fahrzeug.command';

/**
 * Handler für ErfasseTemporalesFahrzeugCommand.
 *
 * Erfasst ein temporäres Fahrzeug für einen aktiven Einsatz.
 * Implementiert AC1-AC4 der Story 3-2.
 *
 * **AC1 - Temporäres Fahrzeug anlegen:**
 * - Handler erstellt EinsatzFahrzeug OHNE Referenz zu Stammdaten
 * - User gibt funkrufname, fahrzeugtypId und optional kennzeichen manuell ein
 * - stammId bleibt undefined
 *
 * **AC2 - Duplikat-Validierung:**
 * - Prüft ob Funkrufname bereits im Einsatz existiert
 * - Verhindert Unique Constraint Violation mit frühem Feedback
 *
 * **AC3 - Fahrzeugtyp-Validierung:**
 * - Lädt Fahrzeugtyp per fahrzeugtypId
 * - Prüft ob Fahrzeugtyp existiert und aktiv ist
 *
 * **AC4 - Atomare Event-Persistierung (Outbox Pattern):**
 * - TransactionalCommandHandler sichert atomare Persistierung
 * - Event wird in Outbox gespeichert, nicht direkt emittiert
 */
@Injectable()
export class ErfasseTemporalesFahrzeugHandler extends TransactionalCommandHandler<ErfasseTemporalesFahrzeugCommand, EinsatzFahrzeugDto> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly einsatzFahrzeugRepository: IEinsatzFahrzeugRepository,
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
   * 1. Fahrzeugtyp laden und validieren
   * 2. Duplikat-Check: Funkrufname bereits im Einsatz?
   * 3. EinsatzFahrzeug erstellen (temporär, ohne stammId)
   * 4. Speichern in Transaction
   * 5. Domain Events extrahieren für Outbox
   */
  protected async executeInTransaction(command: ErfasseTemporalesFahrzeugCommand, tx: TransactionContext): Promise<Result<EinsatzFahrzeugDto> | { result: EinsatzFahrzeugDto; events: DomainEvent[] }> {
    // 1. Validate Fahrzeugtyp ID format
    const fahrzeugtypIdResult = FahrzeugtypId.create(command.fahrzeugtypId);
    if (fahrzeugtypIdResult.isFailure) {
      return Result.fail(fahrzeugtypIdResult.error ?? 'Ungültige Fahrzeugtyp ID');
    }
    const fahrzeugtypId = fahrzeugtypIdResult.value;
    if (!fahrzeugtypId) {
      this.logger.error('FahrzeugtypId.create returned success but value is null');
      throw new Error('Fahrzeugtyp ID validation succeeded but value is null');
    }

    // 2. Load Fahrzeugtyp (AC3: muss existieren)
    const fahrzeugtypResult = await this.fahrzeugtypRepository.findById(fahrzeugtypId, tx);
    if (fahrzeugtypResult.isFailure) {
      return Result.fail(fahrzeugtypResult.error ?? 'Fehler beim Laden des Fahrzeugtyps');
    }
    if (!fahrzeugtypResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND, `Fahrzeugtyp mit ID '${command.fahrzeugtypId}' nicht gefunden`));
    }
    const fahrzeugtyp = fahrzeugtypResult.value;
    if (!fahrzeugtyp.istAktiv) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_INACTIVE, `Fahrzeugtyp '${fahrzeugtyp.bezeichnung}' ist inaktiv und kann nicht verwendet werden`));
    }

    // 3. Duplikat-Check: Funkrufname bereits im Einsatz? (AC2)
    const existsResult = await this.einsatzFahrzeugRepository.existsByEinsatzIdAndFunkrufname(command.einsatzId, command.funkrufname, tx);
    if (existsResult.isFailure) {
      return Result.fail(existsResult.error ?? 'Fehler bei der Duplikat-Prüfung');
    }
    if (existsResult.value) {
      return Result.fail(EinsatzFahrzeugError.format(EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE, `Fahrzeug '${command.funkrufname}' ist bereits im Einsatz erfasst`));
    }

    // 4. Create EinsatzFahrzeug Aggregate (Temporary - AC1)
    const aggregateResult = EinsatzFahrzeug.createTemporary({
      einsatzId: command.einsatzId,
      fahrzeugtypId: command.fahrzeugtypId,
      funkrufname: command.funkrufname,
      kennzeichen: command.kennzeichen,
      createdBy: command.createdBy,
      position: command.position,
    });

    if (aggregateResult.isFailure || !aggregateResult.value) {
      return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen des EinsatzFahrzeugs');
    }
    const einsatzFahrzeug = aggregateResult.value;

    // 5. Save Aggregate in Transaction
    const saveResult = await this.einsatzFahrzeugRepository.save(einsatzFahrzeug, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern des EinsatzFahrzeugs');
    }

    // 6. Extract Domain Events (für Outbox - AC4)
    const events = einsatzFahrzeug.getDomainEvents();
    einsatzFahrzeug.clearDomainEvents();

    this.logger.log(`Temporäres EinsatzFahrzeug erfasst: ${einsatzFahrzeug.id.value} (${einsatzFahrzeug.funkrufname}) für Einsatz ${command.einsatzId}`);

    // 7. Map to DTO and return
    const dto = EinsatzFahrzeugQueryMapper.toDto(einsatzFahrzeug, fahrzeugtyp);
    return { result: dto, events };
  }
}
