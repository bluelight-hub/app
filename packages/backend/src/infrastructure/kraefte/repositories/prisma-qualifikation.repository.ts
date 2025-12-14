import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { IQualifikationRepository, TransactionContext } from '@domain/kraefte/repositories/i-qualifikation.repository';
import type { QualifikationId } from '@domain/kraefte/value-objects/qualifikation-id';
import { PrismaQualifikationMapper } from '../mappers/prisma-qualifikation.mapper';
import { isPrismaError } from '../../../shared/utils/prisma.util';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IQualifikationRepository (Hexagonal Architecture).
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
 */
@Injectable()
export class PrismaQualifikationRepository implements IQualifikationRepository {
  private readonly logger = new Logger(PrismaQualifikationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

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
        // Spezielle Meldung für abkuerzung mit tatsächlichem Wert
        if (fieldName.includes('abkuerzung') && aggregateValue) {
          return `Die Abkürzung "${aggregateValue}" ist bereits vergeben.`;
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
   * Speichert das Qualifikation-Aggregat (Upsert: Create oder Update).
   *
   * **Constraint Handling (Result Pattern statt Exception):**
   * - P2002: Unique Constraint Violation (abkuerzung bereits vergeben)
   * - P2003: Foreign Key Constraint (createdBy/updatedBy User existiert nicht)
   *
   * **Error Scenarios:**
   * - BUSINESS ERROR: P2002 (Duplikat), P2003 (FK) → Result.fail mit deutscher Meldung
   * - PROGRAMMING ERROR: Sonstige DB-Fehler → Result.fail mit technischer Meldung
   *
   * @param aggregate - Das zu speichernde Qualifikation Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: Qualifikation, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaQualifikationMapper.toPersistence(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.qualifikation.upsert({
        where: { id: persistenceData.id },
        create: {
          id: persistenceData.id,
          name: persistenceData.name,
          abkuerzung: persistenceData.abkuerzung,
          kategorie: persistenceData.kategorie,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          createdBy: persistenceData.createdBy,
          updatedBy: persistenceData.updatedBy,
        },
        update: {
          name: persistenceData.name,
          abkuerzung: persistenceData.abkuerzung,
          kategorie: persistenceData.kategorie,
          beschreibung: persistenceData.beschreibung,
          istAktiv: persistenceData.istAktiv,
          sortOrder: persistenceData.sortOrder,
          updatedBy: persistenceData.updatedBy,
          // id, createdAt, createdBy sind immutabel
        },
      });

      this.logger.debug(`Qualifikation saved: ${aggregate.id.value}`);
      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (abkuerzung oder andere unique fields)
      if (isPrismaError(error, 'P2002')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error && error.meta ? error.meta : undefined;
        const target = meta && typeof meta === 'object' && 'target' in meta ? meta.target : 'unknown';
        const fieldName = Array.isArray(target) ? target.join(', ') : String(target);
        this.logger.warn(`Unique constraint violation on field: ${fieldName}`, { aggregateId: aggregate.id.value, tx: !!tx });

        const errorMessage = this.formatPrismaError(error, 'Speichern', aggregate.abkuerzung);
        return Result.fail<void>(errorMessage);
      }

      // P2003: Foreign Key Constraint Failed (createdBy/updatedBy User existiert nicht)
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error && error.meta ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';
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
      this.logger.error(`Failed to save Qualifikation: ${errorMessage}`, { aggregateId: aggregate.id.value, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Speichern der Qualifikation: ${errorMessage}`);
    }
  }

  /**
   * Findet eine Qualifikation nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * @param id - Qualifikation ID
   * @param tx - Optional: Transaction Context
   * @returns Result<Qualifikation | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: QualifikationId, tx?: TransactionContext): Promise<Result<Qualifikation | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.qualifikation.findUnique({
        where: { id: id.value },
      });

      if (!entity) {
        return Result.ok<Qualifikation | null>(null);
      }

      const domainResult = PrismaQualifikationMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute Qualifikation: ${domainResult.error}`, { id: id.value, tx: !!tx });
        return Result.fail<Qualifikation | null>(`Fehler beim Laden der Qualifikation: ${domainResult.error}`);
      }

      return Result.ok<Qualifikation | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find Qualifikation by id: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<Qualifikation | null>(`Fehler beim Laden der Qualifikation: ${errorMessage}`);
    }
  }

  /**
   * Findet eine Qualifikation nach Abkürzung (für Uniqueness-Check).
   *
   * **Use Case:** Wird von Application Layer genutzt um Duplikate zu prüfen.
   *
   * @param abkuerzung - Die eindeutige Abkürzung (z.B. "NotSan")
   * @param tx - Optional: Transaction Context
   * @returns Result<Qualifikation | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByAbkuerzung(abkuerzung: string, tx?: TransactionContext): Promise<Result<Qualifikation | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.qualifikation.findUnique({
        where: { abkuerzung },
      });

      if (!entity) {
        return Result.ok<Qualifikation | null>(null);
      }

      const domainResult = PrismaQualifikationMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute Qualifikation: ${domainResult.error}`, { abkuerzung, tx: !!tx });
        return Result.fail<Qualifikation | null>(`Fehler beim Laden der Qualifikation: ${domainResult.error}`);
      }

      return Result.ok<Qualifikation | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find Qualifikation by abkuerzung: ${errorMessage}`, { abkuerzung, tx: !!tx, error });
      return Result.fail<Qualifikation | null>(`Fehler beim Laden der Qualifikation: ${errorMessage}`);
    }
  }

  /**
   * Listet alle Qualifikationen mit optionalem Filter.
   *
   * **Sortierung:** Primär nach sortOrder ASC, sekundär nach name ASC.
   * **Performance:** Nutzt Index `@@index([istAktiv, sortOrder])` wenn Filter aktiv.
   *
   * @param filter - Optional: Filter-Optionen (istAktiv)
   * @param tx - Optional: Transaction Context
   * @returns Result<Qualifikation[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<Qualifikation[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const where: Prisma.QualifikationWhereInput = {};
      if (filter?.istAktiv !== undefined) {
        where.istAktiv = filter.istAktiv;
      }

      const entities = await client.qualifikation.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: Qualifikation[] = [];
      for (const entity of entities) {
        const domainResult = PrismaQualifikationMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          this.logger.warn(`Skipping Qualifikation due to reconstitution failure: ${domainResult.error}`, { id: entity.id, tx: !!tx });
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<Qualifikation[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find all Qualifikationen: ${errorMessage}`, { filter, tx: !!tx, error });
      return Result.fail<Qualifikation[]>(`Fehler beim Laden der Qualifikationen: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob eine Qualifikation mit gegebener ID existiert.
   *
   * **Performance:** Verwendet findUnique mit select statt count (effizienter).
   *
   * @param id - Qualifikation ID
   * @param tx - Optional: Transaction Context
   * @returns Result<boolean> - Success mit true/false, Failure bei DB-Fehler
   */
  async exists(id: QualifikationId, tx?: TransactionContext): Promise<Result<boolean>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.qualifikation.findUnique({
        where: { id: id.value },
        select: { id: true },
      });

      return Result.ok<boolean>(entity !== null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check Qualifikation existence: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<boolean>(`Fehler bei der Existenzprüfung: ${errorMessage}`);
    }
  }
}
