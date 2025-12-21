import { Injectable, Inject } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IEinsatzPersonRepository } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { EinsatzPersonId } from '@domain/kraefte/value-objects/einsatz-person-id';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-person.repository';
import { PrismaEinsatzPersonMapper } from '../mappers/prisma-einsatz-person.mapper';
import { EINSATZ_PERSON_ERROR_CODES } from '@domain/kraefte/common/einsatz-person-error-codes';
import { isPrismaError } from '@/shared/utils/prisma.util';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Konvertiert framework-agnostischen TransactionContext zu Prisma Transaction Client.
 *
 * **Type Safety:** Explizite Funktion mit klarer Signatur statt inline Cast.
 * **Warum:** TransactionContext ist framework-agnostisch (Domain Layer Interface),
 * aber Infrastructure Layer nutzt konkrete Prisma Transaction.
 *
 * @param tx - Optional: Framework-agnostischer Transaction Context
 * @param fallback - Fallback Client wenn tx undefined ist
 * @returns PrismaTransactionClient oder Fallback
 */
function getTransactionClient(tx: TransactionContext | undefined, fallback: PrismaService): PrismaTransactionClient | PrismaService {
  return (tx as PrismaTransactionClient | undefined) ?? fallback;
}

/**
 * Prisma Implementation des IEinsatzPersonRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support (AC5 - Outbox Pattern):**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 * - TransactionContext ist framework-agnostisch (wird zu PrismaTransactionClient gecastet)
 *
 * **Unique Constraint Handling (AC3 - Duplikat-Validierung):**
 * - UNIQUE(einsatzId, stammId) in DB
 * - P2002 Error → Result.fail mit DUPLICATE_PERSON Code
 * - Keine Exception werfen für erwartete Business-Fehler
 *
 * **M:N Qualifikationen Handling:**
 * - EinsatzPersonQualifikation Junction Table
 * - save() verwendet deleteMany + create für atomic replace
 * - Eager Loading mit include: { qualifikationen: true }
 *
 * **Cascade Delete:**
 * - EinsatzPersonen werden automatisch mit Einsatz gelöscht
 * - DB Constraint: ON DELETE CASCADE auf einsatzId FK
 * - Qualifikationen werden automatisch mit EinsatzPerson gelöscht (CASCADE)
 */
@Injectable()
export class PrismaEinsatzPersonRepository implements IEinsatzPersonRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Speichert das EinsatzPerson-Aggregat (Upsert: Create oder Update).
   *
   * **M:N Qualifikationen Handling:**
   * - Bei Update: Löscht ALLE bestehenden Qualifikationen (deleteMany)
   * - Erstellt NEUE Qualifikationen aus Aggregate (atomic replace)
   * - Verhindert "orphaned" Junction Table Records
   *
   * **Constraint Handling (Result Pattern statt Exception - AC4):**
   * - P2002: Unique Constraint Violation (stammId pro Einsatz bereits vergeben)
   * - P2003: Foreign Key Constraint (einsatzId, stammId, qualifikationId existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat) → Result.fail mit DUPLICATE_PERSON
   * - BUSINESS ERROR: P2003 (FK) → Result.fail mit entsprechendem Code
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Exception werfen
   *
   * @param aggregate - Das zu speichernde EinsatzPerson Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: EinsatzPerson, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaEinsatzPersonMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = getTransactionClient(tx, this.prisma);

      await client.einsatzPerson.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          einsatzId: persistenceData.einsatzId,
          stammId: persistenceData.stammId,
          fahrzeugId: persistenceData.fahrzeugId,
          vorname: persistenceData.vorname,
          nachname: persistenceData.nachname,
          funktion: persistenceData.funktion,
          funkrufname: persistenceData.funkrufname,
          position: persistenceData.position,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
          // M:N: Qualifikationen erstellen
          qualifikationen: {
            create: aggregate.qualifikationIds.map((qId) => ({
              qualifikationId: qId,
              createdBy: aggregate.createdBy,
            })),
          },
        },
        update: {
          // einsatzId ist IMMUTABLE (FK zum Einsatz)
          // stammId ist IMMUTABLE (Referenz zum Original-StammPerson)
          fahrzeugId: persistenceData.fahrzeugId,
          vorname: persistenceData.vorname,
          nachname: persistenceData.nachname,
          funktion: persistenceData.funktion,
          funkrufname: persistenceData.funkrufname,
          position: persistenceData.position,
          updatedBy: persistenceData.updatedBy,
          // M:N: Qualifikationen atomic replace (delete all + create new)
          qualifikationen: {
            deleteMany: {},
            create: aggregate.qualifikationIds.map((qId) => ({
              qualifikationId: qId,
              createdBy: aggregate.createdBy,
            })),
          },
          // id, createdAt, createdBy sind immutabel
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (einsatzId, stammId)
      if (isPrismaError(error, 'P2002')) {
        // Prüfe ob es die (einsatzId, stammId) Kombination ist
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : undefined;
        const fields = Array.isArray(target) ? target : [String(target ?? 'unknown')];

        if (fields.includes('stammId') || fields.includes('einsatzId') || fields.includes('einsatz_person_einsatz_stamm_unique')) {
          return Result.fail<void>(EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON);
        }
      }

      // P2003: Foreign Key Constraint Failed
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';

        if (String(fieldName).includes('stammId') || String(fieldName).includes('stamm_id')) {
          return Result.fail<void>(EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND);
        }
        if (String(fieldName).includes('einsatzId') || String(fieldName).includes('einsatz_id')) {
          return Result.fail<void>(EINSATZ_PERSON_ERROR_CODES.EINSATZ_NOT_FOUND);
        }
        if (String(fieldName).includes('fahrzeugId') || String(fieldName).includes('fahrzeug_id')) {
          return Result.fail<void>(EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND);
        }
        if (String(fieldName).includes('qualifikationId') || String(fieldName).includes('qualifikation_id')) {
          return Result.fail<void>(EINSATZ_PERSON_ERROR_CODES.INVALID_QUALIFIKATION);
        }
      }

      // Andere Fehler sind Programming Errors → Exception werfen
      throw error;
    }
  }

  /**
   * Findet eine EinsatzPerson nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Eager Loading:** Lädt Qualifikationen-Relation mit `include: { qualifikationen: true }`
   * für Domain Aggregate Rekonstitution (qualifikationIds Array).
   *
   * @param id - EinsatzPersonId
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzPerson | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: EinsatzPersonId, tx?: TransactionContext): Promise<Result<EinsatzPerson | null>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      const entity = await client.einsatzPerson.findUnique({
        where: { id: id.value },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
      });

      if (!entity) {
        return Result.ok<EinsatzPerson | null>(null);
      }

      const domainResult = PrismaEinsatzPersonMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<EinsatzPerson | null>(`Fehler beim Laden der Einsatz-Person: ${domainResult.error}`);
      }

      return Result.ok<EinsatzPerson | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzPerson | null>(`Fehler beim Laden der Einsatz-Person: ${errorMessage}`);
    }
  }

  /**
   * Findet alle EinsatzPersonen eines Einsatzes.
   *
   * **Use Case:** Anzeige aller Personen in der Lagekarte/Einsatzübersicht.
   *
   * **Sortierung:** Nach Nachname ASC, dann Vorname ASC (alphabetisch).
   *
   * **Performance:** Nutzt Index `@@index([einsatzId])`.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzPerson[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findByEinsatzId(einsatzId: string, tx?: TransactionContext): Promise<Result<EinsatzPerson[]>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      const entities = await client.einsatzPerson.findMany({
        where: { einsatzId },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
        orderBy: [{ nachname: 'asc' }, { vorname: 'asc' }],
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: EinsatzPerson[] = [];
      for (const entity of entities) {
        const domainResult = PrismaEinsatzPersonMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          // Logging für Data Integrity Violations (verhindert Data Loss)
          this.logger.warn(`Einsatz-Person Rekonstitution fehlgeschlagen für ID ${entity.id}: ${domainResult.error ?? 'Unbekannter Fehler'} (einsatzId=${einsatzId})`, 'PrismaEinsatzPersonRepository');
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<EinsatzPerson[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzPerson[]>(`Fehler beim Laden der Einsatz-Personen: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob eine StammPerson bereits im Einsatz registriert ist.
   *
   * **AC3 - Duplikat-Validierung:**
   * Diese Methode wird VOR Erstellung aufgerufen um Unique Constraint
   * Verletzung zu vermeiden (User-freundliche Fehlermeldung statt DB-Error).
   *
   * **Performance:** Verwendet findFirst mit select statt count (effizienter).
   * Nutzt UNIQUE Index auf (einsatzId, stammId).
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param stammId - Die zu prüfende StammPerson-ID
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - true wenn Duplikat existiert
   */
  async existsByEinsatzIdAndStammId(einsatzId: string, stammId: string, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      const entity = await client.einsatzPerson.findFirst({
        where: { einsatzId, stammId },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }

  /**
   * Findet alle EinsatzPersonen die einem Fahrzeug zugewiesen sind.
   *
   * **Story 4.3 - Besatzung anzeigen:**
   * Lädt alle Personen mit fahrzeugId für kompakte Besatzungs-Liste im Widget.
   *
   * **Sortierung:** Nach Erstellungszeitpunkt DESC (neueste zuerst).
   *
   * **Performance:** Nutzt Index `@@index([fahrzeugId])`.
   *
   * @param fahrzeugId - Die EinsatzFahrzeug-ID (CUID2)
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzPerson[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findByFahrzeugId(fahrzeugId: string, tx?: TransactionContext): Promise<Result<EinsatzPerson[]>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      const entities = await client.einsatzPerson.findMany({
        where: { fahrzeugId },
        include: {
          qualifikationen: {
            select: {
              qualifikationId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: EinsatzPerson[] = [];
      for (const entity of entities) {
        const domainResult = PrismaEinsatzPersonMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          this.logger.warn(
            `Einsatz-Person Rekonstitution fehlgeschlagen für ID ${entity.id}: ${domainResult.error ?? 'Unbekannter Fehler'} (fahrzeugId=${fahrzeugId})`,
            'PrismaEinsatzPersonRepository',
          );
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<EinsatzPerson[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzPerson[]>(`Fehler beim Laden der Besatzung: ${errorMessage}`);
    }
  }
}
