import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { ILogger } from '@domain/ports/i-logger.port';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
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
   * @returns Result mit EinsatzPerson ID oder Fehler
   */
  protected async executeInTransaction(command: RegistrierePersonViaQrCodeCommand, tx: TransactionContext): Promise<Result<{ result: string; events: DomainEvent[] }>> {
    // 1. StammPerson-Lookup via Personalnummer (AC3)
    const stammPersonResult = await this.stammPersonRepository.findByPersonalnummer(command.personalnummer, tx);

    if (stammPersonResult.isFailure) {
      this.logger.error(`StammPerson Lookup fehlgeschlagen: ${stammPersonResult.error}`, 'RegistrierePersonViaQrCodeHandler');
      return Result.fail(stammPersonResult.error ?? 'Fehler beim Stammdaten-Lookup');
    }

    const stammPerson = stammPersonResult.value;

    // 2. Falls StammPerson gefunden: Duplikat-Check
    if (stammPerson) {
      // Check if person is archived
      if (stammPerson.archivedAt) {
        return Result.fail(
          EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND, `StammPerson '${stammPerson.vorname} ${stammPerson.nachname}' ist archiviert und kann nicht registriert werden`),
        );
      }

      const existsResult = await this.einsatzPersonRepository.existsByEinsatzIdAndStammId(command.einsatzId, stammPerson.id.value, tx);

      if (existsResult.isFailure) {
        this.logger.error(`Duplikat-Check fehlgeschlagen: ${existsResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail(existsResult.error ?? 'Fehler bei der Duplikat-Pruefung');
      }

      if (existsResult.value === undefined) {
        this.logger.error('Repository returned Result.ok(undefined) for duplicate check', 'RegistrierePersonViaQrCodeHandler');
        return Result.fail('Interner Fehler bei der Duplikat-Pruefung');
      }

      if (existsResult.value) {
        this.logger.warn(`QR-Duplikat: StammPerson ${stammPerson.id.value} bereits in Einsatz ${command.einsatzId}`, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON, `Person '${stammPerson.vorname} ${stammPerson.nachname}' ist bereits im Einsatz registriert`));
      }
    }

    // 3. EinsatzPerson erstellen
    let einsatzPerson: EinsatzPerson;

    if (stammPerson) {
      // StammPerson gefunden -> Snapshot Pattern (KOPIE der Daten)
      // StammPerson hat keine Funktion - Default ist 'Helfer' fuer QR-Registrierung
      const aggregateResult = EinsatzPerson.createFromStammPerson({
        einsatzId: command.einsatzId,
        stammId: stammPerson.id.value,
        vorname: stammPerson.vorname,
        nachname: stammPerson.nachname,
        funktion: 'Helfer', // Default fuer QR-Registrierung (AC3)
        funkrufname: stammPerson.funkkenungBOS,
        qualifikationIds: stammPerson.qualifikationIds,
        createdBy: command.registriertVon,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        this.logger.error(`EinsatzPerson Erstellung fehlgeschlagen: ${aggregateResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der EinsatzPerson');
      }

      einsatzPerson = aggregateResult.value;

      this.logger.log(`EinsatzPerson aus Stammdaten erstellt: ${einsatzPerson.id.value} (${stammPerson.vorname} ${stammPerson.nachname}) via QR`, 'RegistrierePersonViaQrCodeHandler');
    } else {
      // Keine StammPerson gefunden -> Temporaere Person aus QR-Daten
      const aggregateResult = EinsatzPerson.createTemporary({
        einsatzId: command.einsatzId,
        vorname: command.vorname,
        nachname: command.nachname,
        funktion: 'Helfer', // Default Funktion fuer QR-Registrierung (AC3)
        funkrufname: command.funkkennung,
        createdBy: command.registriertVon,
      });

      if (aggregateResult.isFailure || !aggregateResult.value) {
        this.logger.error(`Temporaere EinsatzPerson Erstellung fehlgeschlagen: ${aggregateResult.error}`, 'RegistrierePersonViaQrCodeHandler');
        return Result.fail(aggregateResult.error ?? 'Fehler beim Erstellen der temporaeren EinsatzPerson');
      }

      einsatzPerson = aggregateResult.value;

      this.logger.log(
        `Temporaere EinsatzPerson erstellt: ${einsatzPerson.id.value} (${command.vorname} ${command.nachname}) via QR - keine StammPerson mit Personalnummer '${command.personalnummer}' gefunden`,
        'RegistrierePersonViaQrCodeHandler',
      );
    }

    // 4. EinsatzPerson speichern
    const saveResult = await this.einsatzPersonRepository.save(einsatzPerson, tx);
    if (saveResult.isFailure) {
      this.logger.error(`EinsatzPerson Speichern fehlgeschlagen: ${saveResult.error}`, 'RegistrierePersonViaQrCodeHandler');
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der EinsatzPerson');
    }

    // 5. Domain Events extrahieren (fuer Outbox - AC3 ETB Auto-Eintrag)
    const events = einsatzPerson.getDomainEvents();
    einsatzPerson.clearDomainEvents();

    return Result.ok({ result: einsatzPerson.id.value, events });
  }
}
