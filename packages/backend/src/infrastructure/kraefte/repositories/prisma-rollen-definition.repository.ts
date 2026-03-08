import type { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { RollenDefinition } from '@domain/kraefte/aggregates/rollen-definition.aggregate';
import { ROLLE_ERROR_CODES, RolleError } from '@domain/kraefte/common/rolle-error-codes';
import type { IRollenDefinitionRepository, TransactionContext } from '@domain/kraefte/repositories/i-rollen-definition.repository';
import type { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { LOGGER } from '@infrastructure/di-tokens';
import { Inject, Injectable } from '@nestjs/common';
import { isPrismaError } from '@/shared/utils';
import { PrismaRollenDefinitionMapper } from '../mappers/prisma-rollen-definition.mapper';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IRollenDefinitionRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **M:N Relationship Strategy:**
 * - RollenDefinition Stammdaten: save() mit Upsert
 * - M:N Junction Records (RolleQualifikation): Separate Methoden (saveQualifikationen/deleteQualifikationen)
 * - REPLACE-Semantik: deleteQualifikationen() + saveQualifikationen() in Transaction
 * - findById/findAll: Nutzen `include: { erforderlicheQualifikationen: true }`
 *
 * **Transaction Support:**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 */
@Injectable()
export class PrismaRollenDefinitionRepository implements IRollenDefinitionRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Speichert das RollenDefinition-Aggregat (Upsert: Create oder Update).
   *
   * **WICHTIG:** Diese Methode speichert nur die Stammdaten der RollenDefinition.
   * M:N-Beziehungen (erforderlicheQualifikationen) müssen separat über
   * saveQualifikationen() gespeichert werden (nach save() aufrufen).
   *
   * **Constraint Handling (Result Pattern statt Exception):**
   * - P2002: Unique Constraint Violation (name bereits vergeben)
   * - P2003: Foreign Key Constraint (createdBy/updatedBy User existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat), P2003 (FK) → Result.fail mit deutscher Meldung
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Result.fail mit technischer Meldung
   *
   * @param aggregate - Das zu speichernde RollenDefinition Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: RollenDefinition, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaRollenDefinitionMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.rollenDefinition.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          name: persistenceData.name,
          funkrufname: persistenceData.funkrufname,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          name: persistenceData.name,
          funkrufname: persistenceData.funkrufname,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      this.logger.debug(`RollenDefinition saved: ${aggregate.id.value}`);
      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (name bereits vergeben)
      if (isPrismaError(error, 'P2002')) {
        const fieldName = this.extractFieldNameFromMeta(error, 'P2002');
        this.logger.warn(`Unique constraint violation on field: ${fieldName}`, { aggregateId: aggregate.id.value, tx: !!tx });

        const errorMessage = this.formatPrismaError(error, 'Speichern', aggregate.name);
        return Result.fail<void>(RolleError.format(ROLLE_ERROR_CODES.NAME_DUPLICATE, errorMessage));
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
      this.logger.error(`Failed to save RollenDefinition: ${errorMessage}`, { aggregateId: aggregate.id.value, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Speichern der RollenDefinition: ${errorMessage}`);
    }
  }

  /**
   * Speichert die M:N-Beziehungen zwischen Rolle und Qualifikationen.
   *
   * **WICHTIG:** Diese Methode sollte NACH save() und deleteQualifikationen() in
   * derselben Transaction aufgerufen werden (REPLACE-Semantik).
   *
   * Erstellt Junction Table Einträge (RolleQualifikation) mit separaten Audit-Feldern
   * (createdAt wird von Prisma @default() gesetzt, createdBy wird übergeben).
   *
   * **Use Case:**
   * - Handler ruft: save() → deleteQualifikationen() → saveQualifikationen() in Transaction
   * - Ersetzt bestehende Qualifikationen komplett (kein Merge, sondern Replace)
   *
   * **Constraint Handling:**
   * - P2002: Unique Constraint auf (rolleId, qualifikationId) → Result.fail
   * - P2003: Foreign Key Constraint (qualifikationId existiert nicht) → Result.fail
   *
   * @param rolleId - ID der RollenDefinition
   * @param qualifikationIds - IDs der zu verknüpfenden Qualifikationen (kann leer sein)
   * @param createdBy - User-ID für Audit-Trail (wird in Junction Record gespeichert)
   * @param tx - Transaktionskontext (sollte mit save() identisch sein)
   * @returns Result<void> - Success oder Failure
   */
  async saveQualifikationen(rolleId: RolleId, qualifikationIds: string[], createdBy: string, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      // Wenn leer, nichts zu tun (DELETE-only Operation im Handler)
      if (qualifikationIds.length === 0) {
        this.logger.debug(`No qualifikationen to save for RollenDefinition: ${rolleId.value}`);
        return Result.ok<void>(undefined);
      }

      // Batch-Insert der Junction Records
      const createManyData = qualifikationIds.map((qualifikationId) => ({
        rolleId: rolleId.value,
        qualifikationId,
        istPflicht: true, // Default: alle Qualifikationen sind Pflicht (kann später erweitert werden)
        createdBy,
      }));

      await client.rolleQualifikation.createMany({
        data: createManyData,
        skipDuplicates: false, // Wir wollen P2002 bei Duplikaten (sollte nicht passieren nach deleteQualifikationen)
      });

      this.logger.debug(`Saved ${qualifikationIds.length} qualifikationen for RollenDefinition: ${rolleId.value}`);
      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (rolleId + qualifikationId Duplikat)
      if (isPrismaError(error, 'P2002')) {
        this.logger.warn(`Unique constraint violation in junction table`, { rolleId: rolleId.value, tx: !!tx });
        return Result.fail<void>('Fehler beim Speichern der Qualifikationen: Duplikat erkannt (sollte nicht passieren).');
      }

      // P2003: Foreign Key Constraint Failed (qualifikationId existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        this.logger.warn(`FK constraint violation in junction table`, { rolleId: rolleId.value, tx: !!tx });
        return Result.fail<void>('Fehler beim Speichern der Qualifikationen: Eine oder mehrere Qualifikationen existieren nicht.');
      }

      // Allgemeine Fehlerbehandlung
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save qualifikationen: ${errorMessage}`, { rolleId: rolleId.value, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Speichern der Qualifikationen: ${errorMessage}`);
    }
  }

  /**
   * Löscht alle Qualifikations-Verknüpfungen für eine Rolle.
   *
   * **Use Case:** Wird VOR saveQualifikationen() aufgerufen um REPLACE-Semantik zu implementieren
   * (bestehende Verknüpfungen werden ersetzt, nicht gemergt).
   *
   * **DELETE CASCADE:** Löscht nur Junction Records, nicht die referenzierten Qualifikationen selbst.
   *
   * **WICHTIG:** Diese Methode sollte in derselben Transaction wie save() und saveQualifikationen()
   * aufgerufen werden (atomare Operation).
   *
   * @param rolleId - ID der RollenDefinition
   * @param tx - Transaktionskontext
   * @returns Result<void> - Success oder Failure
   */
  async deleteQualifikationen(rolleId: RolleId, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const result = await client.rolleQualifikation.deleteMany({
        where: { rolleId: rolleId.value },
      });

      this.logger.debug(`Deleted ${result.count} qualifikationen for RollenDefinition: ${rolleId.value}`);
      return Result.ok<void>(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete qualifikationen: ${errorMessage}`, { rolleId: rolleId.value, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Löschen der Qualifikationen: ${errorMessage}`);
    }
  }

  /**
   * Findet eine RollenDefinition nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Include Strategy:** Lädt M:N-Beziehungen (erforderlicheQualifikationen) eager
   * da diese Teil des Aggregate Roots sind und in UI/DTOs benötigt werden.
   *
   * @param id - RollenDefinition ID
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenDefinition | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: RolleId, tx?: TransactionContext): Promise<Result<RollenDefinition | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.rollenDefinition.findUnique({
        where: { id: id.value },
        include: { erforderlicheQualifikationen: true }, // Eager Load M:N Junction Records
      });

      if (!entity) {
        return Result.ok<RollenDefinition | null>(null);
      }

      const domainResult = PrismaRollenDefinitionMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute RollenDefinition: ${domainResult.error}`, { id: id.value, tx: !!tx });
        return Result.fail<RollenDefinition | null>(`Fehler beim Laden der RollenDefinition: ${domainResult.error}`);
      }

      return Result.ok<RollenDefinition | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find RollenDefinition by id: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<RollenDefinition | null>(`Fehler beim Laden der RollenDefinition: ${errorMessage}`);
    }
  }

  /**
   * Findet eine RollenDefinition nach Name (für Uniqueness-Check).
   *
   * **Use Case:** Wird von Application Layer genutzt um Duplikate zu prüfen.
   *
   * **Case-Sensitivity:** PostgreSQL UNIQUE Constraint ist case-sensitive.
   * "Fahrer" und "fahrer" werden als unterschiedliche Namen behandelt und sind beide erlaubt.
   * Dies ist beabsichtigt, da Rollennamen oft Groß-/Kleinschreibung unterscheiden.
   * Falls Case-Insensitiv gewünscht ist, muss entweder:
   * 1. Eine Normalisierung (toUpperCase()) im Application Layer erfolgen, oder
   * 2. Ein PostgreSQL CITEXT Spaltentyp verwendet werden (Prisma Schema Änderung).
   *
   * **Include Strategy:** Lädt M:N-Beziehungen (erforderlicheQualifikationen) eager.
   *
   * @param name - Der eindeutige Name (z.B. "Gruppenführer")
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenDefinition | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByName(name: string, tx?: TransactionContext): Promise<Result<RollenDefinition | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.rollenDefinition.findUnique({
        where: { name },
        include: { erforderlicheQualifikationen: true }, // Eager Load M:N Junction Records
      });

      if (!entity) {
        return Result.ok<RollenDefinition | null>(null);
      }

      const domainResult = PrismaRollenDefinitionMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute RollenDefinition: ${domainResult.error}`, { name, tx: !!tx });
        return Result.fail<RollenDefinition | null>(`Fehler beim Laden der RollenDefinition: ${domainResult.error}`);
      }

      return Result.ok<RollenDefinition | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find RollenDefinition by name: ${errorMessage}`, { name, tx: !!tx, error });
      return Result.fail<RollenDefinition | null>(`Fehler beim Laden der RollenDefinition: ${errorMessage}`);
    }
  }

  /**
   * Listet alle RollenDefinitionen mit optionalem Filter.
   *
   * **Sortierung:** Primär nach sortOrder ASC, sekundär nach name ASC.
   * **Performance:** Nutzt Index `@@index([istAktiv, sortOrder])` wenn Filter aktiv.
   *
   * **Include Strategy:** Lädt M:N-Beziehungen (erforderlicheQualifikationen) eager
   * da diese Teil des Aggregate Roots sind.
   *
   * @param filter - Optional: Filter-Optionen (istAktiv)
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenDefinition[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<RollenDefinition[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const where: Prisma.RollenDefinitionWhereInput = {};
      if (filter?.istAktiv !== undefined) {
        where.istAktiv = filter.istAktiv;
      }

      const entities = await client.rollenDefinition.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { erforderlicheQualifikationen: true }, // Eager Load M:N Junction Records
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: RollenDefinition[] = [];
      for (const entity of entities) {
        const domainResult = PrismaRollenDefinitionMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          this.logger.warn(`Skipping RollenDefinition due to reconstitution failure: ${domainResult.error}`, { id: entity.id, tx: !!tx });
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<RollenDefinition[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find all RollenDefinitionen: ${errorMessage}`, { filter, tx: !!tx, error });
      return Result.fail<RollenDefinition[]>(`Fehler beim Laden der RollenDefinitionen: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob eine RollenDefinition mit gegebener ID existiert.
   *
   * **Performance:** Verwendet findUnique mit select statt count (effizienter).
   *
   * @param id - RollenDefinition ID
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - Success mit true/false, Failure bei DB-Fehler
   */
  async exists(id: RolleId, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.rollenDefinition.findUnique({
        where: { id: id.value },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check RollenDefinition existence: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }

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

    const meta = typeof error === 'object' && true && 'meta' in error && error.meta ? error.meta : undefined;

    switch (code) {
      case 'P2002': {
        // Unique Constraint Violation - extrahiere betroffene Felder
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : 'unknown';
        const fieldName = Array.isArray(target) ? target.join(', ') : String(target);
        // Spezielle Meldung für name mit tatsächlichem Wert
        if (fieldName.includes('name') && aggregateValue) {
          return `Der Name "${aggregateValue}" ist bereits vergeben.`;
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
}
