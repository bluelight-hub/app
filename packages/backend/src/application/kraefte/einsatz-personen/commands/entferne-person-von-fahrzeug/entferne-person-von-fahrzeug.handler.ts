import { Inject, Injectable } from '@nestjs/common';
import { TransactionalCommandHandler } from '@application/common/handlers/transactional-command.handler';
import { KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
// biome-ignore lint/style/useImportType: NestJS DI requires runtime symbol for @Inject
import { ILogger } from '@domain/ports/i-logger.port';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common/transaction';
import type { EntfernePersonVonFahrzeugCommand } from './entferne-person-von-fahrzeug.command';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';

/**
 * Handler zum Entfernen einer Person von einem Fahrzeug.
 *
 * Business Rules:
 * - Person MUSS existieren
 * - Idempotent: Nicht zugewiesen → Success ohne Event
 * - Falls zugewiesen: Lädt Fahrzeug für Funkrufname (Event/ETB)
 */
@Injectable()
export class EntfernePersonVonFahrzeugHandler extends TransactionalCommandHandler<EntfernePersonVonFahrzeugCommand, void> {
  constructor(
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly personRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG)
    private readonly fahrzeugRepository: IEinsatzFahrzeugRepository,
    @Inject(OUTBOX_REPOSITORY)
    outboxRepository: IOutboxRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
    prisma: PrismaService,
  ) {
    super(prisma, outboxRepository);
  }

  /**
   * Implementiert Business Logic innerhalb der Transaktion.
   *
   * **Result Pattern (AC4):**
   * - Gibt Result.fail() für erwartete Business-Fehler zurück (statt throw)
   * - Exceptions nur für unerwartete Fehler (DB-Connection, Programming Errors)
   *
   * **H2: Transaction Context Validation:**
   * - Validiert tx parameter zu Beginn (null-check)
   * - Garantiert atomare Konsistenz zwischen Aggregate und Outbox
   *
   * **H5: Idempotency Strategy:**
   * - Handler-level check (nicht Aggregate-level)
   * - Grund: Performance - Vermeidet unnötige DB-Writes wenn bereits entfernt
   * - Alternative: Aggregate könnte check machen, aber würde trotzdem save() aufrufen
   *
   * @param command - EntfernePersonVonFahrzeugCommand mit Person-ID
   * @param tx - Transaction Context für atomare Persistierung (REQUIRED)
   * @returns Result.fail() oder { result: undefined; events: DomainEvent[] }
   */
  protected async executeInTransaction(command: EntfernePersonVonFahrzeugCommand, tx: TransactionContext): Promise<Result<void> | { result: undefined; events: DomainEvent[] }> {
    // H2: Transaction Context Validation - Garantiert atomare Persistierung
    if (!tx) {
      return Result.fail('Transaction context is required for atomic operations');
    }

    // 1. Person-ID Value Object erstellen
    const personIdResult = EinsatzPersonId.create(command.personId);
    if (personIdResult.isFailure || !personIdResult.value) {
      // H1: Result Pattern - Return Result.fail() statt throw
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, `Ungültige Person-ID: ${command.personId}`));
    }

    // 2. Person laden
    const personResult = await this.personRepository.findById(personIdResult.value, tx);
    if (personResult.isFailure || !personResult.value) {
      // H1: Result Pattern - Return Result.fail() statt throw
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.NOT_FOUND, `Person ${command.personId} nicht gefunden`));
    }
    const person = personResult.value;

    // 3. Idempotenz: Falls nicht zugewiesen → Success ohne Event
    // H5: Handler-level idempotency check (statt Aggregate-level)
    // Vermeidet unnötige DB-Writes und Event-Emission
    if (!person.fahrzeugId) {
      this.logger.log(`Person ${person.id.value} ist keinem Fahrzeug zugewiesen (idempotent)`, 'EntfernePersonVonFahrzeugHandler');
      return { result: undefined, events: [] };
    }

    // 4. Fahrzeug laden für Funkrufname (wird im Event/ETB benötigt)
    const fahrzeugIdResult = EinsatzFahrzeugId.create(person.fahrzeugId);
    let fahrzeugFunkrufname = 'Unbekanntes Fahrzeug';

    if (fahrzeugIdResult.isSuccess && fahrzeugIdResult.value) {
      const fahrzeugResult = await this.fahrzeugRepository.findById(fahrzeugIdResult.value, tx);
      if (fahrzeugResult.isSuccess && fahrzeugResult.value) {
        fahrzeugFunkrufname = fahrzeugResult.value.funkrufname;
      } else {
        // Fahrzeug nicht mehr vorhanden - trotzdem Zuweisung entfernen
        this.logger.warn(`Fahrzeug ${person.fahrzeugId} nicht mehr vorhanden, entferne Zuweisung trotzdem`, 'EntfernePersonVonFahrzeugHandler');
      }
    } else {
      // Sollte nicht passieren, da fahrzeugId bereits validiert wurde beim Zuweisen
      this.logger.warn(`Ungültige Fahrzeug-ID im Aggregate: ${person.fahrzeugId}`, 'EntfernePersonVonFahrzeugHandler');
    }

    // 5. Person von Fahrzeug entfernen (Domain Logic)
    const removeResult = person.removeFromFahrzeug(fahrzeugFunkrufname, command.updatedBy);
    if (removeResult.isFailure) {
      // H1: Result Pattern - Return Result.fail() statt throw
      return Result.fail(removeResult.error ?? 'Fehler beim Entfernen der Person vom Fahrzeug');
    }

    // 6. Speichern
    const saveResult = await this.personRepository.save(person, tx);
    if (saveResult.isFailure) {
      // H1: Result Pattern - Return Result.fail() statt throw (EXCEPT: DB Connection Failures)
      // NOTE: saveResult.error kann ein DB-Fehler sein - hier bewusst Result.fail() statt throw
      // da Repository bereits zwischen Business- und Technical-Errors unterscheidet
      return Result.fail(EinsatzPersonError.format(EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED, `Person speichern fehlgeschlagen: ${saveResult.error}`));
    }

    // 7. Events extrahieren (für Outbox)
    const events = person.getDomainEvents();
    person.clearDomainEvents();

    // Logging ohne PII (GDPR)
    this.logger.log(`Person ${person.id.value} von Fahrzeug entfernt`, 'EntfernePersonVonFahrzeugHandler');

    return { result: undefined, events };
  }
}
