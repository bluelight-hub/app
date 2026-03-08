import { Inject, Injectable } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { FunkStatusConfig } from '@domain/kraefte/aggregates/funk-status-config.aggregate';
import type { IFunkStatusConfigRepository, TransactionContext } from '@domain/kraefte/repositories/i-funk-status-config.repository';
import type { FunkStatusConfigId } from '@domain/kraefte/value-objects/funk-status-config-id';
import { PrismaFunkStatusConfigMapper } from '../mappers/prisma-funk-status-config.mapper';
import { isPrismaError } from '@/shared/utils';
import { FUNKSTATUS_ERROR_CODES, FunkStatusError } from '@domain/kraefte/common/error-codes';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma Implementation des IFunkStatusConfigRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Config-Only Pattern:**
 * - KEIN save() - FunkStatusConfig wird NICHT neu erstellt, nur aktualisiert
 * - KEIN delete() - FunkStatusConfig ist permanente System-Konfiguration
 * - NUR findAll(), findByCode(), findById(), update()
 *
 * **Persistence Strategy:**
 * - Update Pattern für update() (KEIN Upsert!)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support:**
 * - Optional tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 */
@Injectable()
export class PrismaFunkStatusConfigRepository implements IFunkStatusConfigRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Formatiert Prisma-Fehler zu deutschen, benutzerfreundlichen Fehlermeldungen.
   *
   * **Unterstützte Error Codes:**
   * - P2025: Record Not Found (Status-Code existiert nicht)
   *
   * **WARUM nur P2025?**
   * - P2002 (Unique Constraint): Nicht relevant, code ist immutable
   * - P2003 (Foreign Key): createdBy/updatedBy werden vom Frontend validiert
   * - Config-Only Pattern: Keine Create-Operation, daher weniger Fehlerszenarien
   *
   * @param error - Der Prisma-Fehler (unknown type)
   * @param context - Kontextinformation für Fallback-Meldung (z.B. "Aktualisieren")
   * @param code - Optional: Code-Wert für kontextspezifische Meldungen
   * @returns Formatierte deutsche Fehlermeldung
   */
  private formatPrismaError(error: unknown, context: string, code?: number): string {
    // Check if error is a Prisma error (has code property)
    if (!(typeof error === 'object' && error !== null && 'code' in error)) {
      return `Datenbankfehler bei ${context}`;
    }

    if (isPrismaError(error, 'P2025')) {
      // Record Not Found
      if (code !== undefined) {
        return FunkStatusError.format(FUNKSTATUS_ERROR_CODES.NOT_FOUND, `FunkStatusConfig mit Code ${code} nicht gefunden`);
      }
      return FunkStatusError.format(FUNKSTATUS_ERROR_CODES.NOT_FOUND, 'FunkStatusConfig nicht gefunden');
    }

    // Allgemeiner Fehler
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Datenbankfehler: ${errorMessage}`;
  }

  /**
   * Listet alle FunkStatusConfig Einträge (Status 0-9).
   *
   * **Sortierung:** Nach code ASC (0, 1, 2, ..., 9).
   * **Performance:** Index auf code (unique) wird genutzt.
   *
   * @param tx - Optional: Transaction Context
   * @returns Result<FunkStatusConfig[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findAll(tx?: TransactionContext): Promise<Result<FunkStatusConfig[]>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entities = await client.funkStatusConfig.findMany({
        orderBy: { code: 'asc' },
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: FunkStatusConfig[] = [];
      for (const entity of entities) {
        const domainResult = PrismaFunkStatusConfigMapper.toDomain(entity);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          this.logger.warn(`Skipping FunkStatusConfig due to reconstitution failure: ${domainResult.error}`, { id: entity.id, tx: !!tx });
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<FunkStatusConfig[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find all FunkStatusConfig: ${errorMessage}`, { tx: !!tx, error });
      return Result.fail<FunkStatusConfig[]>(`Fehler beim Laden der FunkStatusConfig-Einträge: ${errorMessage}`);
    }
  }

  /**
   * Findet eine FunkStatusConfig nach Status-Code (0-9).
   *
   * **Use Case:** Wird vom Controller genutzt für Einzelansicht und Update-Validierung.
   * **Performance:** Nutzt unique Index auf code (schnell).
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * @param code - Der Status-Code (0-9)
   * @param tx - Optional: Transaction Context
   * @returns Result<FunkStatusConfig | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findByCode(code: number, tx?: TransactionContext): Promise<Result<FunkStatusConfig | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.funkStatusConfig.findUnique({
        where: { code },
      });

      if (!entity) {
        return Result.ok<FunkStatusConfig | null>(null);
      }

      const domainResult = PrismaFunkStatusConfigMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute FunkStatusConfig: ${domainResult.error}`, { code, tx: !!tx });
        return Result.fail<FunkStatusConfig | null>(`Fehler beim Laden der FunkStatusConfig: ${domainResult.error}`);
      }

      return Result.ok<FunkStatusConfig | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find FunkStatusConfig by code: ${errorMessage}`, { code, tx: !!tx, error });
      return Result.fail<FunkStatusConfig | null>(`Fehler beim Laden der FunkStatusConfig: ${errorMessage}`);
    }
  }

  /**
   * Findet eine FunkStatusConfig nach ID.
   *
   * **Use Case:** Fallback-Methode wenn nur ID bekannt ist (z.B. aus Events).
   * **Performance:** Nutzt Primary Key Index (schnell).
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * @param id - Die FunkStatusConfigId
   * @param tx - Optional: Transaction Context
   * @returns Result<FunkStatusConfig | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: FunkStatusConfigId, tx?: TransactionContext): Promise<Result<FunkStatusConfig | null>> {
    try {
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      const entity = await client.funkStatusConfig.findUnique({
        where: { id: id.value },
      });

      if (!entity) {
        return Result.ok<FunkStatusConfig | null>(null);
      }

      const domainResult = PrismaFunkStatusConfigMapper.toDomain(entity);
      if (domainResult.isFailure || !domainResult.value) {
        // Rekonstitutionsfehler = Programming Error (Dateninkonsistenz)
        this.logger.error(`Failed to reconstitute FunkStatusConfig: ${domainResult.error}`, { id: id.value, tx: !!tx });
        return Result.fail<FunkStatusConfig | null>(`Fehler beim Laden der FunkStatusConfig: ${domainResult.error}`);
      }

      return Result.ok<FunkStatusConfig | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find FunkStatusConfig by id: ${errorMessage}`, { id: id.value, tx: !!tx, error });
      return Result.fail<FunkStatusConfig | null>(`Fehler beim Laden der FunkStatusConfig: ${errorMessage}`);
    }
  }

  /**
   * Aktualisiert eine bestehende FunkStatusConfig.
   *
   * **Config-Only Pattern: NUR Update, KEIN save() mit Upsert!**
   * FunkStatusConfig wird via Seed/Migration erstellt, nicht via Application Layer.
   *
   * **Error Handling (Result Pattern statt Exception):**
   * - P2025: Record Not Found (Code existiert nicht)
   * - WARUM keine P2002/P2003 Checks?
   *   - code ist immutable (wird nicht geupdatet) → keine Unique Constraint Violations
   *   - updatedBy wird vom Frontend validiert (existiert) → keine FK Violations
   *
   * @param aggregate - Das zu aktualisierende FunkStatusConfig Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  async update(aggregate: FunkStatusConfig, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const persistenceData = PrismaFunkStatusConfigMapper.toPersistenceUpdate(aggregate);

      // Verwende entweder externe tx oder interne Prisma Client (kein doppeltes $transaction)
      const client = (tx as PrismaTransactionClient | undefined) ?? this.prisma;

      await client.funkStatusConfig.update({
        where: { code: aggregate.code }, // code ist unique key (und immutable)
        data: persistenceData,
      });

      this.logger.debug(`FunkStatusConfig updated: ${aggregate.id.value} (code: ${aggregate.code})`);
      return Result.ok<void>(undefined);
    } catch (error) {
      // P2025: Record Not Found (sollte nicht passieren wenn Controller vorher findByCode macht)
      if (isPrismaError(error, 'P2025')) {
        this.logger.warn(`Record not found during update`, { code: aggregate.code, tx: !!tx });
        const errorMessage = this.formatPrismaError(error, 'Aktualisieren', aggregate.code);
        return Result.fail<void>(`Fehler beim Aktualisieren: ${errorMessage}`);
      }

      // Allgemeine Fehlerbehandlung
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update FunkStatusConfig: ${errorMessage}`, { code: aggregate.code, tx: !!tx, error });
      return Result.fail<void>(`Fehler beim Aktualisieren der FunkStatusConfig: ${errorMessage}`);
    }
  }
}
