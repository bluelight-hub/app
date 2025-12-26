import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@domain/common/domain-event';
import type { TransactionContext } from '@domain/common';
import { Result } from '@domain/common/result';
import { TransactionalCommandHandler } from '@/application/common/handlers/transactional-command.handler';
// biome-ignore lint/style/useImportType: PrismaService needed for DI at runtime (AC1)
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { IOutboxRepository } from '@domain/repositories/i-outbox.repository';
import { KRAEFTE_REPOSITORIES, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

// Repositories
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { IRollenDefinitionRepository } from '@domain/kraefte/repositories/i-rollen-definition.repository';

// Value Objects
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import { RolleId } from '@domain/kraefte/value-objects/rolle-id';

// Aggregate
import { RollenBesetzung } from '@domain/kraefte/aggregates/rollen-besetzung.aggregate';

// Error Codes
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';

// Command
import type { BesetzeRolleCommand } from './besetze-rolle.command';

/**
 * Handler für die Besetzung einer Führungsrolle mit einer qualifizierten Person.
 *
 * Implementiert die Business Logic für Story 5.1:
 * - AC1: Qualifikationsprüfung (Pflicht-Qualifikationen)
 * - AC2: Duplikat-Prüfung (UNIQUE Constraint)
 * - AC3: Snapshot-Speicherung (Rollenname, Personenname)
 * - AC4: Automatische Freigabe bei Neu-Besetzung
 *
 * @see BesetzeRolleCommand für Input-Validierung
 * @see RollenBesetzung Aggregate für Domain Logic
 */
@Injectable()
export class BesetzeRolleHandler extends TransactionalCommandHandler<BesetzeRolleCommand, string> {
  constructor(
    prisma: PrismaService,
    @Inject(OUTBOX_REPOSITORY) outboxRepository: IOutboxRepository,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_PERSON)
    private readonly einsatzPersonRepository: IEinsatzPersonRepository,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_DEFINITION)
    private readonly rollenDefinitionRepository: IRollenDefinitionRepository,
    @Inject(LOGGER)
    private readonly logger: ILogger,
  ) {
    super(prisma, outboxRepository);
  }

  protected async executeInTransaction(command: BesetzeRolleCommand, tx: TransactionContext): Promise<Result<string> | { result: string; events: DomainEvent[] }> {
    // 1. Create Value Objects
    const einsatzIdResult = EinsatzId.create(command.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail(`Ungültige Einsatz-ID: ${einsatzIdResult.error}`);
    }
    const einsatzId = einsatzIdResult.value;

    const personIdResult = EinsatzPersonId.create(command.einsatzPersonId);
    if (personIdResult.isFailure || !personIdResult.value) {
      return Result.fail(`Ungültige Person-ID: ${personIdResult.error}`);
    }
    const personId = personIdResult.value;

    const rolleIdResult = RolleId.create(command.rollenDefinitionId);
    if (rolleIdResult.isFailure || !rolleIdResult.value) {
      return Result.fail(`Ungültige Rollen-ID: ${rolleIdResult.error}`);
    }
    const rolleId = rolleIdResult.value;

    // 2. Load EinsatzPerson (AC1: Qualifikationsprüfung)
    const personResult = await this.einsatzPersonRepository.findById(personId, tx);
    if (personResult.isFailure || !personResult.value) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND);
    }
    const person = personResult.value;

    // 3. Load RollenDefinition (für Qualifikationsprüfung + Rollenname)
    const rolleResult = await this.rollenDefinitionRepository.findById(rolleId, tx);
    if (rolleResult.isFailure || !rolleResult.value) {
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND);
    }
    const rolle = rolleResult.value;

    // 4. AC1: Qualifikationsprüfung - Person muss alle Pflicht-Qualifikationen haben
    const pflichtQualifikationen = rolle.erforderlicheQualifikationen.filter((q) => q.istPflicht);
    const personQualifikationIds = person.qualifikationIds;

    for (const pflichtQuali of pflichtQualifikationen) {
      if (!personQualifikationIds.includes(pflichtQuali.qualifikationId)) {
        this.logger.log(`Person ${personId.value} hat Pflicht-Qualifikation ${pflichtQuali.qualifikationId} nicht für Rolle ${rolle.name}`, 'BesetzeRolleHandler');
        return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED);
      }
    }

    // 5. AC2/AC4: Prüfen ob Rolle bereits besetzt ist
    const existingResult = await this.rollenBesetzungRepository.findByEinsatzIdAndRolleId(einsatzId, rolleId, tx);
    if (existingResult.isFailure) {
      return Result.fail('Fehler beim Prüfen bestehender Besetzung');
    }

    // Events sammeln (von freigegebener und neuer Besetzung)
    const allEvents: DomainEvent[] = [];

    // AC4: Bei bestehender Besetzung automatisch freigeben
    const existingBesetzung = existingResult.value;
    if (existingBesetzung) {
      // Freigeben und Events sammeln
      const freigebenResult = existingBesetzung.freigeben(command.besetztVon);
      if (freigebenResult.isFailure) {
        // BEREITS_FREIGEGEBEN sollte hier nicht auftreten (wir suchen nur aktive Besetzungen)
        // Falls doch: Log und fahre fort (kein Fehler, bereits gewünschter Zustand)
        this.logger.log(`Bestehende Besetzung ${existingBesetzung.id.value} war bereits freigegeben (${freigebenResult.error})`, 'BesetzeRolleHandler');
      } else {
        const freigebenEvents = existingBesetzung.getDomainEvents();
        existingBesetzung.clearDomainEvents();
        allEvents.push(...freigebenEvents);
      }

      // Alte Besetzung löschen
      const deleteResult = await this.rollenBesetzungRepository.delete(existingBesetzung.id, tx);
      if (deleteResult.isFailure) {
        return Result.fail(deleteResult.error ?? 'Fehler beim Freigeben der bestehenden Besetzung');
      }

      this.logger.log(`Bestehende Besetzung ${existingBesetzung.id.value} freigegeben für Rolle ${rolle.name}`, 'BesetzeRolleHandler');
    }

    // 6. AC3: Neue RollenBesetzung erstellen mit Snapshot-Daten
    const besetzungResult = RollenBesetzung.create({
      einsatzId,
      einsatzPersonId: personId,
      rolleId,
      rollenName: rolle.name,
      personVorname: person.vorname,
      personNachname: person.nachname,
      besetztVon: command.besetztVon,
    });

    if (besetzungResult.isFailure || !besetzungResult.value) {
      return Result.fail(besetzungResult.error ?? 'Fehler beim Erstellen der Rollenbesetzung');
    }
    const besetzung = besetzungResult.value;

    // 7. Speichern
    const saveResult = await this.rollenBesetzungRepository.save(besetzung, tx);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error ?? 'Fehler beim Speichern der Rollenbesetzung');
    }

    // 8. Events extrahieren
    const besetzungEvents = besetzung.getDomainEvents();
    besetzung.clearDomainEvents();
    allEvents.push(...besetzungEvents);

    this.logger.log(`Rolle ${rolle.name} besetzt mit Person ${person.vorname} ${person.nachname}`, 'BesetzeRolleHandler');

    return { result: besetzung.id.value, events: allEvents };
  }
}
