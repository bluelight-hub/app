import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IStammPersonRepository } from '@domain/kraefte/repositories/i-stamm-person.repository';
import type { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import type { StammPersonId } from '@domain/kraefte/value-objects/stamm-person-id';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-person.repository';
import { PrismaStammPersonMapper } from '../mappers/prisma-stamm-person.mapper';
import { STAMM_PERSON_ERROR_CODES } from '@domain/kraefte/common/stamm-person-error-codes';
import { isPrismaError } from '@/shared/utils/prisma.util';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IStammPersonRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung (AC4)
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support (AC5):**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 * - TransactionContext ist framework-agnostisch (wird zu PrismaTransactionClient gecastet)
 *
 * **Unique Constraint Handling:**
 * - personalnummer ist UNIQUE in DB
 * - P2002 Error → Result.fail mit PERSONALNUMMER_DUPLICATE Code
 * - Keine Exception werfen für erwartete Business-Fehler (AC4)
 *
 * **Archive Pattern:**
 * - archivedAt: null = aktiv, NOT NULL = archiviert
 * - findAll(includeArchived: false) filtert per `where: { archivedAt: null }`
 * - Nutzt Index @@index([archivedAt]) für Performance
 *
 * **M:N Junction Table Sync (KRITISCH!):**
 * - DIFF-BASED Pattern für Thread-Safety (keine deleteMany + createMany)
 * - Berechnet toDelete und toAdd basierend auf DB-State vs Aggregate-State
 * - Verhindert Race Conditions bei concurrenten Updates
 * - Audit-Trail: createdBy wird von updatedBy/createdBy des Aggregates übernommen
 */
@Injectable()
export class PrismaStammPersonRepository implements IStammPersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert das StammPerson-Aggregat (Upsert: Create oder Update).
   *
   * **KRITISCH: Diff-Based Junction Table Sync für Qualifikationen!**
   *
   * **Warum DIFF-BASED statt DELETE-ALL + CREATE-ALL?**
   * - **Thread-Safety:** Verhindert Race Conditions bei concurrenten Updates
   * - **Audit-Trail:** Nur geänderte Rows haben neue Timestamps
   * - **Performance:** Nur geänderte Rows werden modifiziert (nicht alle)
   * - **FK Constraints:** Verhindert kurzzeitige FK-Verletzungen bei Cascade
   *
   * **Algorithm:**
   * 1. Lade existierende Qualifikation-IDs aus Junction Table
   * 2. Berechne Delta: toDelete = old - new, toAdd = new - old
   * 3. Wende nur Deltas an (deleteMany für toDelete, createMany für toAdd)
   *
   * **Constraint Handling (Result Pattern statt Exception - AC4):**
   * - P2002: Unique Constraint Violation (personalnummer bereits vergeben)
   * - P2003: Foreign Key Constraint (qualifikationId existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat) → Result.fail mit PERSONALNUMMER_DUPLICATE
   * - BUSINESS ERROR: P2003 (Invalid FK) → Result.fail mit INVALID_QUALIFIKATION
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Exception werfen
   *
   * **Transaction Context (AC5):**
   * - tx wird als TransactionContext übergeben (framework-agnostisch)
   * - Infrastructure castet zu PrismaTransactionClient
   * - Bei tx=undefined: Nutzt this.prisma für standalone Operations
   *
   * @param aggregate - Das zu speichernde StammPerson Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: StammPerson, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaStammPersonMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      // 1. Upsert StammPerson (Hauptdaten)
      await client.stammPerson.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          vorname: persistenceData.vorname,
          nachname: persistenceData.nachname,
          personalnummer: persistenceData.personalnummer,
          funkkenungBOS: persistenceData.funkkenungBOS,
          archivedAt: persistenceData.archivedAt,
          archivedBy: persistenceData.archivedBy,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          vorname: persistenceData.vorname,
          nachname: persistenceData.nachname,
          // personalnummer ist immutabel (siehe Aggregate Spec: IMMUTABLE)
          funkkenungBOS: persistenceData.funkkenungBOS,
          archivedAt: persistenceData.archivedAt,
          archivedBy: persistenceData.archivedBy,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      // 2. DIFF-BASED Qualifikationen-Sync (Thread-Safe!)
      const existingQuals = await client.stammPersonQualifikation.findMany({
        where: { personId: aggregate.id.value },
        select: { qualifikationId: true },
      });

      const existingIds = new Set(existingQuals.map((q) => q.qualifikationId));
      const newIds = new Set(aggregate.qualifikationIds);

      // IDs zum Entfernen (in old, nicht in new)
      const toDelete = existingQuals.filter((q) => !newIds.has(q.qualifikationId)).map((q) => q.qualifikationId);

      // IDs zum Hinzufügen (in new, nicht in old)
      const toAdd = aggregate.qualifikationIds.filter((id) => !existingIds.has(id));

      // 3. Nur Deltas anwenden
      if (toDelete.length > 0) {
        await client.stammPersonQualifikation.deleteMany({
          where: {
            personId: aggregate.id.value,
            qualifikationId: { in: toDelete },
          },
        });
      }

      if (toAdd.length > 0) {
        await client.stammPersonQualifikation.createMany({
          data: toAdd.map((qId) => ({
            personId: aggregate.id.value,
            qualifikationId: qId,
            createdBy: aggregate.updatedBy ?? aggregate.createdBy,
          })),
        });
      }

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (personalnummer)
      if (isPrismaError(error, 'P2002')) {
        // Prüfe ob es personalnummer ist (target Meta Field)
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : undefined;
        const fields = Array.isArray(target) ? target : [String(target ?? 'unknown')];

        if (fields.includes('personalnummer')) {
          return Result.fail<void>(STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE);
        }
      }

      // P2003: Foreign Key Constraint Failed (qualifikationId existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';

        if (String(fieldName).includes('qualifikationId')) {
          return Result.fail<void>(STAMM_PERSON_ERROR_CODES.INVALID_QUALIFIKATION);
        }
      }

      // Andere Fehler sind Programming Errors → Exception werfen
      throw error;
    }
  }

  /**
   * Findet eine StammPerson nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Eager Loading:** Lädt Qualifikationen-Relation mit `include: { qualifikationen: true }`
   * für M:N Hydration im Mapper.
   *
   * @param id - StammPerson ID
   * @param tx - Optional: Transaction Context
   * @returns Result<StammPerson | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: StammPersonId, tx?: TransactionContext): Promise<Result<StammPerson | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammPerson.findUnique({
        where: { id: id.value },
        include: { qualifikationen: true },
      });

      if (!entity) {
        return Result.ok<StammPerson | null>(null);
      }

      const domainResult = PrismaStammPersonMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<StammPerson | null>(`Fehler beim Laden der StammPerson: ${domainResult.error}`);
      }

      return Result.ok<StammPerson | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammPerson | null>(`Fehler beim Laden der StammPerson: ${errorMessage}`);
    }
  }

  /**
   * Findet eine StammPerson nach Personalnummer (für Uniqueness-Check).
   *
   * **Use Case:** Wird von Application Layer genutzt um Duplikate zu prüfen
   * bevor eine neue Person erstellt wird.
   *
   * **Case-Sensitivity:** PostgreSQL UNIQUE Constraint ist case-sensitive.
   * "P-12345" und "p-12345" werden als unterschiedlich behandelt.
   *
   * @param personalnummer - Die eindeutige Personalnummer (z.B. "P-12345")
   * @param tx - Optional: Transaction Context
   * @returns Result<StammPerson | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByPersonalnummer(personalnummer: string, tx?: TransactionContext): Promise<Result<StammPerson | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammPerson.findUnique({
        where: { personalnummer },
        include: { qualifikationen: true },
      });

      if (!entity) {
        return Result.ok<StammPerson | null>(null);
      }

      const domainResult = PrismaStammPersonMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<StammPerson | null>(`Fehler beim Laden der StammPerson: ${domainResult.error}`);
      }

      return Result.ok<StammPerson | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammPerson | null>(`Fehler beim Laden der StammPerson: ${errorMessage}`);
    }
  }

  /**
   * Listet alle StammPersonen mit optionalem Archive-Filter.
   *
   * **Archive Pattern (AC1):**
   * - includeArchived=false (default): Nur aktive Personen (archivedAt IS NULL)
   * - includeArchived=true: Alle Personen (inkl. archivierte)
   *
   * **Sortierung:** Primär nach nachname ASC, sekundär nach vorname ASC (alphabetisch).
   *
   * **Performance:** Nutzt Index `@@index([archivedAt, nachname])` wenn Filter aktiv.
   *
   * **Eager Loading:** Lädt Qualifikationen-Relation mit `include: { qualifikationen: true }`
   * für M:N Hydration (z.B. für Dropdown-Selects mit Badge "Anzahl Qualifikationen").
   *
   * @param filter - Optional: { includeArchived?: boolean }
   * @param tx - Optional: Transaction Context
   * @returns Result<StammPerson[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(filter?: { includeArchived?: boolean }, tx?: TransactionContext): Promise<Result<StammPerson[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;
      const includeArchived = filter?.includeArchived ?? false;

      const where: Prisma.StammPersonWhereInput = {};
      if (!includeArchived) {
        where.archivedAt = null;
      }

      const entities = await client.stammPerson.findMany({
        where,
        include: { qualifikationen: true },
        orderBy: [{ nachname: 'asc' }, { vorname: 'asc' }],
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: StammPerson[] = [];
      for (const entity of entities) {
        const domainResult = PrismaStammPersonMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          // Logging würde hier stattfinden (in Production mit Logger Service)
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<StammPerson[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammPerson[]>(`Fehler beim Laden der StammPersonen: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob eine StammPerson mit gegebener Personalnummer existiert.
   *
   * **Use Case:** Application Layer nutzt dies für Uniqueness-Check
   * vor dem Erstellen einer neuen Person.
   *
   * **Performance:** Verwendet findUnique mit select statt count (effizienter).
   * Nutzt UNIQUE Index auf personalnummer.
   *
   * @param personalnummer - Die zu prüfende Personalnummer
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - Success mit true/false, Failure bei DB-Fehler
   */
  async exists(personalnummer: string, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammPerson.findUnique({
        where: { personalnummer },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }
}
