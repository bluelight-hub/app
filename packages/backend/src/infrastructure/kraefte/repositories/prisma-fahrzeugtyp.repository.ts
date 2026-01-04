import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { Fahrzeugtyp } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import type { IFahrzeugtypRepository, TransactionContext } from '@domain/kraefte/repositories/i-fahrzeugtyp.repository';
import type { FahrzeugtypId } from '@domain/kraefte/value-objects/fahrzeugtyp-id';
import { PrismaFahrzeugtypMapper } from '../mappers/prisma-fahrzeugtyp.mapper';
import { isPrismaError } from '../../../shared/utils/prisma.util';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IFahrzeugtypRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support:**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 *
 * **JSON Handling:**
 * - sollbesatzung wird als JSON in PostgreSQL JSONB gespeichert
 * - Serialisierung/Deserialisierung im Mapper
 */
@Injectable()
export class PrismaFahrzeugtypRepository implements IFahrzeugtypRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Extrahiert Feldname aus Prisma Error Meta für Logging.
   *
   * **Use Case:** Wird für strukturierte Logger-Nachrichten verwendet.
   *
   * @param error - Prisma Error Objekt
   * @param errorCode - Prisma Error Code (P2002, P2003, etc.)
   * @returns Feldname als String (oder 'unknown')
   */
  private extractFieldNameFromMeta(error: unknown, errorCode: 'P2002' | 'P2003'): string {
    const meta = typeof error === 'object' && error !== null && 'meta' in error && error.meta ? error.meta : undefined;

    if (errorCode === 'P2002') {
      // P2002: target ist ein Array von Feldnamen
      const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : 'unknown';
      return Array.isArray(target) ? target.join(', ') : String(target);
    }

    // P2003: field_name ist ein String
    const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';
    return String(fieldName);
  }

  /**
   * Formatiert Prisma-Fehler zu deutschen, benutzerfreundlichen Fehlermeldungen.
   *
   * **Unterstützte Error Codes:**
   * - P2002: Unique Constraint Violation (Duplikat)
   * - P2003: Foreign Key Constraint Failed (Referenzfehler)
   * - P2025: Record Not Found
   *
   * **Meta Extraction:** Verwendet Type Guards für sichere Meta-Extraktion.
   *
   * @param error - Der Prisma-Fehler (unknown type)
   * @param context - Kontextinformation für Fallback-Meldung (z.B. "Speichern")
   * @param aggregateValue - Optional: Wert des betroffenen Feldes für kontextspezifische Meldungen
   * @returns Formatierte deutsche Fehlermeldung
   */
  private formatPrismaError(error: unknown, context: string, aggregateValue?: string): string {
    // Check if error is a Prisma error (has code property)
    if (!(typeof error === 'object' && error !== null && 'code' in error)) {
      return `Datenbankfehler bei ${context}`;
    }

    const code = isPrismaError(error, 'P2002') ? 'P2002' : isPrismaError(error, 'P2003') ? 'P2003' : isPrismaError(error, 'P2025') ? 'P2025' : 'UNKNOWN';

    const meta = typeof error === 'object' && error !== null && 'meta' in error && error.meta ? error.meta : undefined;

    switch (code) {
      case 'P2002': {
        // Unique Constraint Violation - extrahiere betroffene Felder
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : 'unknown';
        const fieldName = Array.isArray(target) ? target.join(', ') : String(target);
        // Spezielle Meldung für code mit tatsächlichem Wert
        if (fieldName.includes('code') && aggregateValue) {
          return `Der Code "${aggregateValue}" ist bereits vergeben.`;
        }
        return `Eindeutiger Wert für Feld "${fieldName}" existiert bereits`;
      }
      case 'P2003': {
        // Foreign Key Constraint Failed - extrahiere Feldname
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';
        return `Referenzierter Benutzer (${fieldName}) existiert nicht`;
      }
      case 'P2025':
        return 'Datensatz nicht gefunden';
      default: {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return `Datenbankfehler: ${errorMessage}`;
      }
    }
  }

  /**
   * Speichert das Fahrzeugtyp-Aggregat (Upsert: Create oder Update).
   *
   * **Constraint Handling (Result Pattern statt Exception):**
   * - P2002: Unique Constraint Violation (code bereits vergeben)
   * - P2003: Foreign Key Constraint (createdBy/updatedBy User existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat), P2003 (FK) → Result.fail mit deutscher Meldung
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Result.fail mit technischer Meldung
   *
   * @param aggregate - Das zu speichernde Fahrzeugtyp Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: Fahrzeugtyp, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaFahrzeugtypMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.fahrzeugtyp.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          code: persistenceData.code,
          bezeichnung: persistenceData.bezeichnung,
          kategorie: persistenceData.kategorie,
          sollbesatzung: persistenceData.sollbesatzung as Prisma.InputJsonValue,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          code: persistenceData.code,
          bezeichnung: persistenceData.bezeichnung,
          kategorie: persistenceData.kategorie,
          sollbesatzung: persistenceData.sollbesatzung as Prisma.InputJsonValue,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      this.logger.debug(`Fahrzeugtyp saved: ${aggregate.id.value}`);
      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (code oder andere unique fields)
      if (isPrismaError(error, 'P2002')) {
        const fieldName = this.extractFieldNameFromMeta(error, 'P2002');
        this.logger.warn(`Unique constraint violation on field: ${fieldName}`, { aggregateId: aggregate.id.value, tx: !!tx });

        const errorMessage = this.formatPrismaError(error, 'Speichern', aggregate.code);
        return Result.fail<void>(errorMessage);
      }

      // P2003: Foreign Key Constraint Failed (createdBy/updatedBy User existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        const fieldName = this.extractFieldNameFromMeta(error, 'P2003');
        this.logger.warn(`FK constraint violation on field: ${fieldName}`, { aggregateId: aggregate.id.value, tx: !!tx });
        const errorMessage = this.formatPrismaError(error, 'Speichern');
        return Result.fail<void>(`Fehler beim Speichern: ${errorMessage}`);
      }

      // P2025: Record Not Found (sollte bei Upsert nicht auftreten, aber defensiv behandeln)
      if (isPrismaError(error, 'P2025')) {
        this.logger.warn(`Record not found during upsert (should not happen)`, { aggregateId: aggregate.id.value, tx: !!tx });
        return Result.fail<void>(`Fehler beim Speichern: Datensatz nicht gefunden (ID: ${aggregate.id.value}).`);
      }

      // Allgemeine Fehlerbehandlung
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save Fahrzeugtyp: ${errorMessage}`, { aggregateId: aggregate.id.value, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Speichern des Fahrzeugtyps: ${errorMessage}`);
    }
  }

  /**
   * Findet einen Fahrzeugtyp nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * @param id - Fahrzeugtyp ID
   * @param tx - Optional: Transaction Context
   * @returns Result<Fahrzeugtyp | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: FahrzeugtypId, tx?: TransactionContext): Promise<Result<Fahrzeugtyp | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.fahrzeugtyp.findUnique({
        where: { id: id.value },
      });

      if (!entity) {
        return Result.ok<Fahrzeugtyp | null>(null);
      }

      const domainResult = PrismaFahrzeugtypMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute Fahrzeugtyp: ${domainResult.error}`, { id: id.value, tx: !!tx });
        return Result.fail<Fahrzeugtyp | null>(`Fehler beim Laden des Fahrzeugtyps: ${domainResult.error}`);
      }

      return Result.ok<Fahrzeugtyp | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find Fahrzeugtyp by id: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<Fahrzeugtyp | null>(`Fehler beim Laden des Fahrzeugtyps: ${errorMessage}`);
    }
  }

  /**
   * Findet einen Fahrzeugtyp nach Code (für Uniqueness-Check).
   *
   * **Use Case:** Wird von Application Layer genutzt um Duplikate zu prüfen.
   *
   * **Case-Sensitivity:** PostgreSQL UNIQUE Constraint ist case-sensitive.
   * "RTW" und "rtw" werden als unterschiedliche Codes behandelt und sind beide erlaubt.
   * Dies ist beabsichtigt, da Fahrzeugtyp-Codes oft standardisiert sind (z.B. DIN).
   * Falls Case-Insensitiv gewünscht ist, muss entweder:
   * 1. Eine Normalisierung (toUpperCase()) im Application Layer erfolgen, oder
   * 2. Ein PostgreSQL CITEXT Spaltentyp verwendet werden (Prisma Schema Änderung).
   *
   * @param code - Der eindeutige Code (z.B. "RTW")
   * @param tx - Optional: Transaction Context
   * @returns Result<Fahrzeugtyp | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByCode(code: string, tx?: TransactionContext): Promise<Result<Fahrzeugtyp | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.fahrzeugtyp.findUnique({
        where: { code },
      });

      if (!entity) {
        return Result.ok<Fahrzeugtyp | null>(null);
      }

      const domainResult = PrismaFahrzeugtypMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute Fahrzeugtyp: ${domainResult.error}`, { code, tx: !!tx });
        return Result.fail<Fahrzeugtyp | null>(`Fehler beim Laden des Fahrzeugtyps: ${domainResult.error}`);
      }

      return Result.ok<Fahrzeugtyp | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find Fahrzeugtyp by code: ${errorMessage}`, { code, tx: !!tx, error });
      return Result.fail<Fahrzeugtyp | null>(`Fehler beim Laden des Fahrzeugtyps: ${errorMessage}`);
    }
  }

  /**
   * Listet alle Fahrzeugtypen mit optionalem Filter.
   *
   * **Sortierung:** Primär nach sortOrder ASC, sekundär nach code ASC.
   * **Performance:** Nutzt Index `@@index([istAktiv, sortOrder])` wenn Filter aktiv.
   *
   * @param filter - Optional: Filter-Optionen (istAktiv)
   * @param tx - Optional: Transaction Context
   * @returns Result<Fahrzeugtyp[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<Fahrzeugtyp[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const where: Prisma.FahrzeugtypWhereInput = {};
      if (filter?.istAktiv !== undefined) {
        where.istAktiv = filter.istAktiv;
      }

      const entities = await client.fahrzeugtyp.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: Fahrzeugtyp[] = [];
      for (const entity of entities) {
        const domainResult = PrismaFahrzeugtypMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          this.logger.warn(`Skipping Fahrzeugtyp due to reconstitution failure: ${domainResult.error}`, { id: entity.id, tx: !!tx });
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<Fahrzeugtyp[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find all Fahrzeugtypen: ${errorMessage}`, { filter, tx: !!tx, error });
      return Result.fail<Fahrzeugtyp[]>(`Fehler beim Laden der Fahrzeugtypen: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob ein Fahrzeugtyp mit gegebener ID existiert.
   *
   * **Performance:** Verwendet findUnique mit select statt count (effizienter).
   *
   * @param id - Fahrzeugtyp ID
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - Success mit true/false, Failure bei DB-Fehler
   */
  async exists(id: FahrzeugtypId, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.fahrzeugtyp.findUnique({
        where: { id: id.value },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check Fahrzeugtyp existence: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }
}
