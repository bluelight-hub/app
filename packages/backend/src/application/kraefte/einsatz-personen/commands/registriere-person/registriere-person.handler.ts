import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
// biome-ignore lint/style/useImportType: IEinsatzPersonRepository needed for DI at runtime
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
// biome-ignore lint/style/useImportType: IStammPersonRepository needed for DI at runtime
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: IOutboxRepository needed for DI at runtime
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { RegistrierePersonCommand } from './registriere-person.command';

/**
 * Handler für RegistrierePersonCommand.
 *
 * Registriert eine Person zu einem aktiven Einsatz. Unterstützt zwei Modi:
 * - **Aus Stammdaten:** Kopiert Daten von StammPerson (Snapshot Pattern)
 * - **Manuelle Erfassung:** Erstellt temporäre Person ohne Stammdaten-Referenz
 *
 * **AC1 - Stammdaten-Person auswählen (optional):**
 * - Handler lädt StammPerson per stammPersonId (falls gesetzt)
 * - Prüft ob StammPerson existiert und nicht archiviert ist
 * - KOPIERT vorname, nachname, funkrufname, qualifikationIds (Snapshot)
 *
 * **AC2 - Manuelle Erfassung:**
 * - Falls stammPersonId = undefined: Verwende manuelle Eingaben
 * - Erstellt EinsatzPerson.createTemporary() ohne Stammdaten-Referenz
 *
 * **AC3 - Atomare Event-Persistierung (Outbox Pattern):**
 * - TransactionalCommandHandler sichert atomare Persistierung
 * - Event wird in Outbox gespeichert, nicht direkt emittiert
 *
 * **AC4 - Duplikat-Validierung:**
 * - Prüft ob StammPerson bereits im Einsatz registriert ist
 * - Verhindert Unique Constraint Violation mit frühem Feedback
 */
@Injectable()
export class RegistrierePersonHandler extends TransactionalCommandHandler<RegistrierePersonCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.STAMM_PERSON)
    private readonly stammPersonRepository: IStammPersonRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Ablauf:**
   * 1. Duplikat-Check: StammPerson bereits im Einsatz? (falls stammPersonId gesetzt)
   * 2. Falls stammPersonId: StammPerson laden und validieren
   * 3. EinsatzPerson erstellen (aus Stammdaten oder temporär)
   * 4. Speichern in Transaction
   * 5. Domain Events extrahieren für Outbox
   *
   * @param command - RegistrierePersonCommand mit Einsatz- und Person-Daten
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result mit EinsatzPerson ID oder Fehler
   */
  protected async executeInTransaction(command: RegistrierePersonCommand, tx: TransactionContext): Promise<Result<{ result: string; events: DomainEvent[] }>> {
    let einsatzPerson: EinsatzPerson;

    // AC1: Falls StammPerson ausgewählt wurde (Snapshot Pattern)
    if (command.stammPersonId) {
      // 1. Validate StammPerson ID format
      const stammIdResult = StammPersonId.create(command.stammPersonId);
      if (stammIdResult.isFailure) {
        return Result.fail(stammIdResult.error ?? 'Ungültige StammPerson ID');
      }
      const stammPersonId = stammIdResult.value;
      if (!stammPersonId) {
        this.logger.error('StammPersonId.create returned success but value is null');
        throw new Error('StammPerson ID validation succeeded but value is null');
      }

      // 2. Duplikat-Check: StammPerson bereits im Einsatz? (AC4)
      const existsResult = await this.einsatzPersonRepository.existsByEinsatzIdAndStammId(command.einsatzId, command.stammPersonId, tx);
      if (existsResult.isFailure) {
        return Result.fail(existsResult.error ?? 'Fehler bei der Duplikat-Prüfung');
      }
      if (existsResult.value) {
        return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, `Person mit StammPerson-ID '${command.stammPersonId}' ist bereits im Einsatz registriert`));
      }

      // 3. Load StammPerson
      const stammPersonResult = await this.stammPersonRepository.findById(stammPersonId, tx);
      if (stammPersonResult.isFailure) {
        return Result.fail(stammPersonResult.error ?? 'Fehler beim Laden der StammPerson');
      }
      if (!stammPersonResult.value) {
        return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND, `StammPerson mit ID '${command.stammPersonId}' nicht gefunden`));
      }
      const stammPerson = stammPersonResult.value;

      // 4. Check if StammPerson is archived
      if (stammPerson.archivedAt) {
        return Result.fail(
          EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND, `StammPerson '${stammPerson.vorname} ${stammPerson.nachname}' ist archiviert und kann nicht registriert werden`),
        );
      }

      // 5. Create EinsatzPerson Aggregate (Snapshot from StammPerson)
      const aggregateResult = EinsatzPerson.createFromStammPerson({
        einsatzId: command.einsatzId,
        stammId: command.stammPersonId,
        vorname: stammPerson.vorname,
        nachname: stammPerson.nachname,
        funktion: command.funktion, // Funktion aus Command (nicht aus StammPerson)
        funkrufname: stammPerson.funkkenungBOS, // KOPIE der BOS-Funkkennung als Funkrufname
        qualifikationIds: stammPerson.qualifikationIds, // KOPIE als Snapshot
        createdBy: command.registriertVon,
        position: command.position,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der EinsatzPerson');
      }
      einsatzPerson = aggregateResult.value;

      this.logger.log(`EinsatzPerson aus Stammdaten erstellt: ${einsatzPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname}) für Einsatz ${command.einsatzId}`);
    }
    // AC2: Manuelle Erfassung (ohne Stammdaten-Referenz)
    else {
      // Create temporary EinsatzPerson (ohne StammPerson-Referenz)
      const aggregateResult = EinsatzPerson.createTemporary({
        einsatzId: command.einsatzId,
        vorname: command.vorname,
        nachname: command.nachname,
        funktion: command.funktion,
        qualifikationIds: command.qualifikationIds,
        createdBy: command.registriertVon,
        position: command.position,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der temporären EinsatzPerson');
      }
      einsatzPerson = aggregateResult.value;

      this.logger.log(`Temporäre EinsatzPerson erstellt: ${einsatzPerson.id.value} (${command.vorname} ${command.nachname}) für Einsatz ${command.einsatzId}`);
    }

    // 6. Save Aggregate in Transaction
    const saveResult = await this.einsatzPersonRepository.save(einsatzPerson, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der EinsatzPerson');
    }

    // 7. Extract Domain Events (für Outbox - AC3)
    const events = einsatzPerson.getDomainEvents();
    einsatzPerson.clearDomainEvents();

    // 8. Return EinsatzPerson ID
    return Result.ok({ result: einsatzPerson.id.value, events });
  }
}
