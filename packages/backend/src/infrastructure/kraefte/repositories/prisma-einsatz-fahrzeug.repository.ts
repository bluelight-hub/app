import { Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IEinsatzFahrzeugRepository } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { EinsatzFahrzeugId } from '@domain/kraefte/value-objects/einsatz-fahrzeug-id';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-fahrzeug.repository';
import { PrismaEinsatzFahrzeugMapper } from '../mappers/prisma-einsatz-fahrzeug.mapper';
import { EINSATZ_FAHRZEUG_ERROR_CODES } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';
import { isPrismaError } from '@/shared/utils/prisma.util';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IEinsatzFahrzeugRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support (AC3 - Outbox Pattern):**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 * - TransactionContext ist framework-agnostisch (wird zu PrismaTransactionClient gecastet)
 *
 * **Unique Constraint Handling (AC4 - Duplikat-Validierung):**
 * - UNIQUE(einsatzId, funkrufname) in DB
 * - P2002 Error → Result.fail mit FUNKRUFNAME_DUPLICATE Code
 * - Keine Exception werfen für erwartete Business-Fehler
 *
 * **Cascade Delete:**
 * - EinsatzFahrzeuge werden automatisch mit Einsatz gelöscht
 * - DB Constraint: ON DELETE CASCADE auf einsatzId FK
 */
@Injectable()
export class PrismaEinsatzFahrzeugRepository implements IEinsatzFahrzeugRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert das EinsatzFahrzeug-Aggregat (Upsert: Create oder Update).
   *
   * **Constraint Handling (Result Pattern statt Exception - AC4):**
   * - P2002: Unique Constraint Violation (funkrufname pro Einsatz bereits vergeben)
   * - P2003: Foreign Key Constraint (einsatzId, fahrzeugtypId existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat) → Result.fail mit FUNKRUFNAME_DUPLICATE
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Exception werfen
   *
   * @param aggregate - Das zu speichernde EinsatzFahrzeug Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: EinsatzFahrzeug, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaEinsatzFahrzeugMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.einsatzFahrzeug.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          einsatzId: persistenceData.einsatzId,
          stammId: persistenceData.stammId,
          funkrufname: persistenceData.funkrufname,
          kennzeichen: persistenceData.kennzeichen,
          fahrzeugtypId: persistenceData.fahrzeugtypId,
          fmsStatus: persistenceData.fmsStatus,
          position: persistenceData.position,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          // einsatzId ist IMMUTABLE (FK zum Einsatz)
          // stammId ist IMMUTABLE (Referenz zum Original-StammFahrzeug)
          // fahrzeugtypId ist IMMUTABLE
          // funkrufname ist IMMUTABLE (Snapshot)
          // kennzeichen ist IMMUTABLE (Snapshot)
          fmsStatus: persistenceData.fmsStatus,
          position: persistenceData.position,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (einsatzId, funkrufname)
      if (isPrismaError(error, 'P2002')) {
        // Prüfe ob es die (einsatzId, funkrufname) Kombination ist
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : undefined;
        const fields = Array.isArray(target) ? target : [String(target ?? 'unknown')];

        if (fields.includes('funkrufname') || fields.includes('einsatz_fahrzeug_einsatz_funkrufname_unique')) {
          return Result.fail<void>(EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE);
        }
      }

      // P2003: Foreign Key Constraint Failed
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';

        if (String(fieldName).includes('fahrzeugtypId') || String(fieldName).includes('fahrzeugtyp_id')) {
          return Result.fail<void>(EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND);
        }
        if (String(fieldName).includes('einsatzId') || String(fieldName).includes('einsatz_id')) {
          return Result.fail<void>(EINSATZ_FAHRZEUG_ERROR_CODES.EINSATZ_NOT_FOUND);
        }
      }

      // Andere Fehler sind Programming Errors → Exception werfen
      throw error;
    }
  }

  /**
   * Findet ein EinsatzFahrzeug nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Eager Loading:** Lädt Fahrzeugtyp-Relation mit `include: { fahrzeugtyp: true }`
   * für DTO-Mapping (Frontend zeigt Fahrzeugtyp-Bezeichnung).
   *
   * @param id - EinsatzFahrzeug ID
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzFahrzeug | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: EinsatzFahrzeugId, tx?: TransactionContext): Promise<Result<EinsatzFahrzeug | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.einsatzFahrzeug.findUnique({
        where: { id: id.value },
        include: { fahrzeugtyp: true },
      });

      if (!entity) {
        return Result.ok<EinsatzFahrzeug | null>(null);
      }

      const domainResult = PrismaEinsatzFahrzeugMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        return Result.fail<EinsatzFahrzeug | null>(`Fehler beim Laden des EinsatzFahrzeugs: ${domainResult.error}`);
      }

      return Result.ok<EinsatzFahrzeug | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzFahrzeug | null>(`Fehler beim Laden des EinsatzFahrzeugs: ${errorMessage}`);
    }
  }

  /**
   * Findet alle EinsatzFahrzeuge eines Einsatzes.
   *
   * **Use Case:** Anzeige aller Fahrzeuge in der Lagekarte/Einsatzübersicht.
   *
   * **Sortierung:** Nach Funkrufname ASC (alphabetisch).
   *
   * **Performance:** Nutzt Index `@@index([einsatzId])`.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzFahrzeug[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findByEinsatzId(einsatzId: string, tx?: TransactionContext): Promise<Result<EinsatzFahrzeug[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entities = await client.einsatzFahrzeug.findMany({
        where: { einsatzId },
        include: { fahrzeugtyp: true },
        orderBy: { funkrufname: 'asc' },
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: EinsatzFahrzeug[] = [];
      for (const entity of entities) {
        const domainResult = PrismaEinsatzFahrzeugMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          // Logging würde hier stattfinden (in Production mit Logger Service)
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<EinsatzFahrzeug[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzFahrzeug[]>(`Fehler beim Laden der EinsatzFahrzeuge: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob ein Fahrzeug mit gegebenem Funkrufnamen bereits im Einsatz existiert.
   *
   * **AC4 - Duplikat-Validierung:**
   * Diese Methode wird VOR Erstellung aufgerufen um Unique Constraint
   * Verletzung zu vermeiden (User-freundliche Fehlermeldung statt DB-Error).
   *
   * **Performance:** Verwendet findFirst mit select statt count (effizienter).
   * Nutzt UNIQUE Index auf (einsatzId, funkrufname).
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param funkrufname - Der zu prüfende Funkrufname
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - true wenn Duplikat existiert
   */
  async existsByEinsatzIdAndFunkrufname(einsatzId: string, funkrufname: string, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.einsatzFahrzeug.findFirst({
        where: { einsatzId, funkrufname },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }
}
