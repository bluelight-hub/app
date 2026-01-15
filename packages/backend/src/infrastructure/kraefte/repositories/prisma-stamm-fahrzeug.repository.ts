import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IStammFahrzeugRepository } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
import type { StammFahrzeug } from '@domain/kraefte/aggregates/stamm-fahrzeug.aggregate';
import type { StammFahrzeugId } from '@domain/kraefte/value-objects/stamm-fahrzeug-id';
import type { TransactionContext } from '@domain/kraefte/repositories/i-stamm-fahrzeug.repository';
import { PrismaStammFahrzeugMapper } from '../mappers/prisma-stamm-fahrzeug.mapper';
import { STAMM_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/stamm-fahrzeug-error-codes';
import { isPrismaError } from '@/shared/utils/prisma.util';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IStammFahrzeugRepository (Hexagonal Architecture).
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
 * - funkrufname ist UNIQUE in DB
 * - P2002 Error → Result.fail mit FUNKRUFNAME_DUPLICATE Code
 * - Keine Exception werfen für erwartete Business-Fehler (AC4)
 *
 * **Archive Pattern:**
 * - archivedAt: null = aktiv, NOT NULL = archiviert
 * - findAll(includeArchived: false) filtert per `where: { archivedAt: null }`
 * - Nutzt Index @@index([archivedAt]) für Performance
 */
@Injectable()
export class PrismaStammFahrzeugRepository implements IStammFahrzeugRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert das StammFahrzeug-Aggregat (Upsert: Create oder Update).
   *
   * **Constraint Handling (Result Pattern statt Exception - AC4):**
   * - P2002: Unique Constraint Violation (funkrufname bereits vergeben)
   * - P2003: Foreign Key Constraint (fahrzeugtypId existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat) → Result.fail mit FUNKRUFNAME_DUPLICATE
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Exception werfen
   *
   * **Transaction Context (AC5):**
   * - tx wird als TransactionContext übergeben (framework-agnostisch)
   * - Infrastructure castet zu PrismaTransactionClient
   * - Bei tx=undefined: Nutzt this.prisma für standalone Operations
   *
   * @param aggregate - Das zu speichernde StammFahrzeug Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: StammFahrzeug, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaStammFahrzeugMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.stammFahrzeug.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          rufname: persistenceData.rufname,
          funkrufname: persistenceData.funkrufname,
          fahrzeugtypId: persistenceData.fahrzeugtypId,
          kennzeichen: persistenceData.kennzeichen,
          baujahr: persistenceData.baujahr,
          funkkenungBOS: persistenceData.funkkenungBOS,
          archivedAt: persistenceData.archivedAt,
          archivedBy: persistenceData.archivedBy,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          rufname: persistenceData.rufname,
          funkrufname: persistenceData.funkrufname,
          // fahrzeugtypId ist immutabel (siehe AC3 Spec: IMMUTABLE)
          kennzeichen: persistenceData.kennzeichen,
          baujahr: persistenceData.baujahr,
          funkkenungBOS: persistenceData.funkkenungBOS,
          archivedAt: persistenceData.archivedAt,
          archivedBy: persistenceData.archivedBy,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (funkrufname)
      if (isPrismaError(error, 'P2002')) {
        // Prüfe ob es funkrufname ist (target Meta Field)
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : undefined;
        const fields = Array.isArray(target) ? target : [String(target ?? 'unknown')];

        if (fields.includes('funkrufname')) {
          return Result.fail<void>(STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE);
        }
      }

      // P2003: Foreign Key Constraint Failed (fahrzeugtypId existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';

        if (String(fieldName).includes('fahrzeugtypId')) {
          return Result.fail<void>(STAMM_FAHRZEUG_ERROR_CODES.INVALID_FAHRZEUGTYP);
        }
      }

      // Andere Fehler sind Programming Errors → Exception werfen
      throw error;
    }
  }

  /**
   * Findet ein StammFahrzeug nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Eager Loading:** Lädt Fahrzeugtyp-Relation mit `include: { fahrzeugtyp: true }`
   * für DTO-Mapping (Frontend zeigt Fahrzeugtyp-Bezeichnung).
   *
   * @param id - StammFahrzeug ID
   * @param tx - Optional: Transaction Context
   * @returns Result<StammFahrzeug | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: StammFahrzeugId, tx?: TransactionContext): Promise<Result<StammFahrzeug | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammFahrzeug.findUnique({
        where: { id: id.value },
        include: { fahrzeugtyp: true },
      });

      if (!entity) {
        return Result.ok<StammFahrzeug | null>(null);
      }

      const domainResult = PrismaStammFahrzeugMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<StammFahrzeug | null>(`Fehler beim Laden des StammFahrzeugs: ${domainResult.error}`);
      }

      return Result.ok<StammFahrzeug | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammFahrzeug | null>(`Fehler beim Laden des StammFahrzeugs: ${errorMessage}`);
    }
  }

  /**
   * Findet ein StammFahrzeug nach Funkrufname (für Uniqueness-Check).
   *
   * **Use Case:** Wird von Application Layer genutzt um Duplikate zu prüfen
   * bevor ein neues Fahrzeug erstellt wird.
   *
   * **Case-Sensitivity:** PostgreSQL UNIQUE Constraint ist case-sensitive.
   * "Rotkreuz 83/1" und "rotkreuz 83/1" werden als unterschiedlich behandelt.
   *
   * @param funkrufname - Der eindeutige Funkrufname (z.B. "Rotkreuz 83/1")
   * @param tx - Optional: Transaction Context
   * @returns Result<StammFahrzeug | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByFunkrufname(funkrufname: string, tx?: TransactionContext): Promise<Result<StammFahrzeug | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammFahrzeug.findUnique({
        where: { funkrufname },
        include: { fahrzeugtyp: true },
      });

      if (!entity) {
        return Result.ok<StammFahrzeug | null>(null);
      }

      const domainResult = PrismaStammFahrzeugMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<StammFahrzeug | null>(`Fehler beim Laden des StammFahrzeugs: ${domainResult.error}`);
      }

      return Result.ok<StammFahrzeug | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammFahrzeug | null>(`Fehler beim Laden des StammFahrzeugs: ${errorMessage}`);
    }
  }

  /**
   * Listet alle StammFahrzeuge mit optionalem Archive-Filter.
   *
   * **Archive Pattern (AC1):**
   * - includeArchived=false (default): Nur aktive Fahrzeuge (archivedAt IS NULL)
   * - includeArchived=true: Alle Fahrzeuge (inkl. archivierte)
   *
   * **Sortierung:** Primär nach rufname ASC (alphabetisch).
   *
   * **Performance:** Nutzt Index `@@index([archivedAt])` wenn Filter aktiv.
   *
   * **Eager Loading:** Lädt Fahrzeugtyp-Relation mit `include: { fahrzeugtyp: true }`
   * für DTO-Mapping (Frontend zeigt Fahrzeugtyp in Tabelle).
   *
   * @param includeArchived - Optional: false (default) = nur aktive, true = alle
   * @param tx - Optional: Transaction Context
   * @returns Result<StammFahrzeug[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(includeArchived = false, tx?: TransactionContext): Promise<Result<StammFahrzeug[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const where: Prisma.StammFahrzeugWhereInput = {};
      if (!includeArchived) {
        where.archivedAt = null;
      }

      const entities = await client.stammFahrzeug.findMany({
        where,
        include: { fahrzeugtyp: true },
        orderBy: { rufname: 'asc' },
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: StammFahrzeug[] = [];
      for (const entity of entities) {
        const domainResult = PrismaStammFahrzeugMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          // Logging würde hier stattfinden (in Production mit Logger Service)
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<StammFahrzeug[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<StammFahrzeug[]>(`Fehler beim Laden der StammFahrzeuge: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob ein StammFahrzeug mit gegebenem Funkrufname existiert.
   *
   * **Use Case:** Application Layer nutzt dies für Uniqueness-Check
   * vor dem Erstellen eines neuen Fahrzeugs.
   *
   * **Performance:** Verwendet findUnique mit select statt count (effizienter).
   * Nutzt UNIQUE Index auf funkrufname.
   *
   * @param funkrufname - Der zu prüfende Funkrufname
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - Success mit true/false, Failure bei DB-Fehler
   */
  async exists(funkrufname: string, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.stammFahrzeug.findUnique({
        where: { funkrufname },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }
}
