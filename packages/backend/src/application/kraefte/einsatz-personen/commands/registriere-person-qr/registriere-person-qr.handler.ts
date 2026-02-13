import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError, DEFAULT_QR_FUNKTION } from '@domain/kraefte/common/einsatz-person-error-codes';
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
/**
 * Command wird nur als Type verwendet (nicht für DI injected).
 * import type ist hier KORREKT, da Command per Parameter übergeben wird.
 */
import type { RegistrierePersonViaQrCodeCommand } from './registriere-person-qr.command';

/**
 * Handler zur Registrierung einer Person via QR-Code (DRK-App Format).
 *
 * Workflow:
 * 1. StammPerson-Lookup via Personalnummer (aus QR "mnr")
 * 2. Bei Treffer: Duplikat-Check + EinsatzPerson aus StammPerson erstellen
 * 3. Kein Treffer: Temporaere EinsatzPerson aus QR-Daten erstellen
 * 4. Events atomar im Outbox persistieren
 *
 * @see Story 4.2 - Person via QR-Code registrieren (AC2, AC3, AC4)
 */
@Injectable()
export class RegistrierePersonViaQrCodeHandler extends TransactionalCommandHandler<RegistrierePersonViaQrCodeCommand, string> {
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
   * @param command - RegistrierePersonViaQrCodeCommand mit QR-Daten
   * @param tx - Transaction Context fuer atomare Persistierung
   * @returns Result mit EinsatzPerson ID und Domain Events
   */
  protected async executeInTransaction(command: RegistrierePersonViaQrCodeCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. StammPerson-Lookup via Personalnummer (AC3)
    const stammPersonResult = await this.stammPersonRepository.findByPersonalnummer(command.personalnummer, tx);

    if (stammPersonResult.isFailure) {
      // GDPR: KEINE Personalnummer im Error Log (PII!)
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_LOOKUP_FAILED, `StammPerson Lookup fehlgeschlagen in Einsatz '${command.einsatzId}': ${stammPersonResult.error}`);
      this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
      return Result.fail<string>(errorMsg);
    }

    const stammPerson = stammPersonResult.value;

    // 2. Falls StammPerson gefunden: Duplikat-Check
    if (stammPerson) {
      // Check if person is archived
      if (stammPerson.archivedAt) {
        // GDPR: KEINE Namen im Error (PII!) - nur StammPerson ID
        return Result.fail<string>(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_ARCHIVED, `StammPerson (ID: ${stammPerson.id.value}) ist archiviert und kann nicht registriert werden`));
      }

      /**
       * RACE CONDITION MITIGATION (TOCTOU):
       *
       * PROBLEM: Zwei simultane QR-Scans könnten beide den existsByEinsatzIdAndStammId Check
       * passieren, bevor einer speichert → doppelte EinsatzPerson.
       *
       * LÖSUNG: DB-Level Unique Constraint (einsatzId + stammId) in Prisma Schema.
       * - Constraint: @@unique([einsatzId, stammId], name: "unique_einsatz_stamm_person")
       * - Bei Collision wirft Prisma PrismaClientKnownRequestError (Code P2002)
       * - Repository wrapped diese Exception → Result.fail mit SAVE_FAILED
       *
       * WICHTIG: Der existsByEinsatzIdAndStammId Check ist eine OPTIMIERUNG für UX
       * (schnelles Feedback), die DB Constraint ist die ECHTE Sicherheitsbarriere.
       *
       * Performance: <3s Requirement (AC5) erfüllt durch DB Index auf unique constraint.
       */
      const existsResult = await this.einsatzPersonRepository.existsByEinsatzIdAndStammId(command.einsatzId, stammPerson.id.value, tx);

      // ISSUE #18 FIX: Unterscheide zwischen DB-Fehler und Programming Error
      if (existsResult.isFailure) {
        // DB-Fehler (z.B. Connection Lost, Timeout)
        const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_CHECK_FAILED, `Duplikat-Check fehlgeschlagen in Einsatz '${command.einsatzId}': ${existsResult.error}`);
        this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail<string>(errorMsg);
      }

      if (existsResult.value === undefined) {
        // Programming Error: Repository sollte NIEMALS undefined zurückgeben
        const errorMsg = 'PROGRAMMING ERROR: Repository.existsByEinsatzIdAndStammId returned undefined (expected boolean)';
        this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
        throw new Error(errorMsg); // Exception für Programming Errors (AC4)
      }

      if (existsResult.value) {
        // GDPR: KEINE Namen/Personalnummer im Error (PII!) - nur StammPerson ID
        const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, `StammPerson (ID: ${stammPerson.id.value}) ist bereits im Einsatz '${command.einsatzId}' registriert`);
        this.logger.warn(errorMsg, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail<string>(errorMsg);
      }
    }

    // 3. EinsatzPerson erstellen
    let einsatzPerson: EinsatzPerson;

    if (stammPerson) {
      // StammPerson gefunden -> Snapshot Pattern (KOPIE der Daten)
      // StammPerson hat keine Funktion - Default Funktion aus Domain-Konstante
      const aggregateResult = EinsatzPerson.createFromStammPerson({
        einsatzId: command.einsatzId,
        stammId: stammPerson.id.value,
        vorname: stammPerson.vorname,
        nachname: stammPerson.nachname,
        funktion: DEFAULT_QR_FUNKTION, // Default fuer QR-Registrierung (AC3)
        funkrufname: stammPerson.funkkenungBOS,
        qualifikationIds: stammPerson.qualifikationIds,
        createdBy: command.registriertVon,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        // GDPR: KEINE Personalnummer im Error (PII!)
        const errorMsg = EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.AGGREGATE_CREATION_FAILED,
          `EinsatzPerson aus Stammdaten fehlgeschlagen in Einsatz '${command.einsatzId}': ${aggregateResult.error}`,
        );
        this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail<string>(errorMsg);
      }

      einsatzPerson = aggregateResult.value;

      /**
       * GDPR-konformes Logging OHNE PII (Personally Identifiable Information).
       *
       * Logged werden NUR:
       * - EinsatzPerson ID (technischer Identifier)
       * - Einsatz ID (technischer Identifier)
       * - StammPerson ID (technischer Identifier)
       *
       * NICHT geloggt: Vorname, Nachname, Personalnummer (PII!)
       */
      this.logger.log(
        `EinsatzPerson aus Stammdaten erstellt: ${einsatzPerson.id.value} (StammPerson: ${stammPerson.id.value}) via QR in Einsatz '${command.einsatzId}'`,
        'RegistrierePersonViaQrCodeHandler',
      );
    } else {
      // Keine StammPerson gefunden -> Temporaere Person aus QR-Daten
      const aggregateResult = EinsatzPerson.createTemporary({
        einsatzId: command.einsatzId,
        vorname: command.vorname,
        nachname: command.nachname,
        funktion: DEFAULT_QR_FUNKTION, // Default Funktion fuer QR-Registrierung (AC3)
        funkrufname: command.funkkennung,
        createdBy: command.registriertVon,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        // GDPR: KEINE Namen/Personalnummer im Error (PII!)
        const errorMsg = EinsatzPersonError.format(
          EINSATZ_PERSON_ERROR_CODES.AGGREGATE_CREATION_FAILED,
          `Temporäre EinsatzPerson fehlgeschlagen in Einsatz '${command.einsatzId}': ${aggregateResult.error}`,
        );
        this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail<string>(errorMsg);
      }

      einsatzPerson = aggregateResult.value;

      /**
       * GDPR-konformes Logging OHNE PII (Personally Identifiable Information).
       *
       * NICHT geloggt: Vorname, Nachname, Personalnummer (PII!)
       */
      this.logger.log(`Temporäre EinsatzPerson erstellt: ${einsatzPerson.id.value} via QR in Einsatz '${command.einsatzId}' (keine StammPerson gefunden)`, 'RegistrierePersonViaQrCodeHandler');
    }

    // 4. EinsatzPerson speichern
    const saveResult = await this.einsatzPersonRepository.save(einsatzPerson, tx);
    if (saveResult.isFailure) {
      // GDPR: KEINE Personalnummer im Error (PII!)
      const errorMsg = EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED, `EinsatzPerson speichern fehlgeschlagen in Einsatz '${command.einsatzId}': ${saveResult.error}`);
      this.logger.error(errorMsg, 'RegistrierePersonViaQrCodeHandler');
      return Result.fail<string>(errorMsg);
    }

    // 5. Domain Events extrahieren (fuer Outbox - AC3 ETB Auto-Eintrag)
    const events = einsatzPerson.getDomainEvents();
    einsatzPerson.clearDomainEvents();

    return { result: einsatzPerson.id.value, events };
  }
}
