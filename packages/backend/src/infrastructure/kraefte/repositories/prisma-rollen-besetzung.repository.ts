import { Injectable, Inject } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IRollenBesetzungRepository, RollenBesetzung } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import type { RollenBesetzungId } from '@domain/kraefte/value-objects/rollen-besetzung-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { RolleId } from '@domain/kraefte/value-objects/rolle-id';
import type { TransactionContext } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import { PrismaRollenBesetzungMapper } from '../mappers/prisma-rollen-besetzung.mapper';
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';
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
 * Prisma Implementation des IRollenBesetzungRepository (Hexagonal Architecture).
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
 * **Unique Constraint Handling (AC2 - verhindert doppelte Besetzung):**
 * - UNIQUE(einsatzId, rollenDefinitionId) in DB
 * - P2002 Error → Result.fail mit ROLLE_ALREADY_BESETZT Code
 * - Keine Exception werfen für erwartete Business-Fehler
 *
 * **Cascade Delete:**
 * - RollenBesetzungen werden automatisch mit Einsatz gelöscht
 * - DB Constraint: ON DELETE CASCADE auf einsatzId FK
 * - DB Constraint: ON DELETE RESTRICT auf rollenDefinitionId/personId FK
 *
 * @remarks Story 5.1: Volle Implementation wenn Domain Aggregate existiert
 */
@Injectable()
export class PrismaRollenBesetzungRepository implements IRollenBesetzungRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Speichert das RollenBesetzung-Aggregat (Create oder Update).
   *
   * **Create vs Update Logik:**
   * - Prüft ob Entity bereits existiert (via findUnique)
   * - Wenn existiert → UPDATE (für Soft-Delete/Freigabe)
   * - Wenn nicht existiert → CREATE (neue Besetzung)
   *
   * **Constraint Handling (Result Pattern statt Exception - AC4):**
   * - P2002: Unique Constraint Violation → ROLLE_ALREADY_BESETZT
   * - P2003: Foreign Key Constraint → PERSON_NOT_FOUND / ROLLE_NOT_FOUND
   *
   * @param aggregate - Das zu speichernde RollenBesetzung Aggregate
   * @param tx - Optional: Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(aggregate: RollenBesetzung, tx?: TransactionContext): Promise<Result<void>> {
    const client = getTransactionClient(tx, this.prisma);

    try {
      // Prüfe ob Entity existiert (Update vs Create)
      const existing = await client.einsatzRollenbesetzung.findUnique({
        where: { id: aggregate.id.value },
      });

      if (existing) {
        // UPDATE für Freigabe (Soft-Delete)
        // Optimistic Locking: Nutzt updatedAt für echte Concurrent Modification Detection
        // Verhindert Race Condition wenn zwei User gleichzeitig freigeben() aufrufen
        const updated = await client.einsatzRollenbesetzung.updateMany({
          where: {
            id: aggregate.id.value,
            updatedAt: existing.updatedAt, // Optimistic: Nur wenn Record nicht verändert wurde
          },
          data: PrismaRollenBesetzungMapper.toUpdatePersistence(aggregate),
        });

        // Race Condition erkannt: Record wurde zwischenzeitlich geändert
        if (updated.count === 0) {
          this.logger.warn(`[save] Optimistic locking failed - RollenBesetzung ${aggregate.id.value} was modified concurrently`, 'RollenBesetzungRepository');
          return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN);
        }
      } else {
        // CREATE für neue Besetzung
        const data = PrismaRollenBesetzungMapper.toPersistence(aggregate);
        await client.einsatzRollenbesetzung.create({ data });
      }

      return Result.ok(undefined);
    } catch (error) {
      return this.handlePrismaError(error, 'save');
    }
  }

  /**
   * Lädt RollenBesetzung anhand ihrer ID.
   *
   * **Success Cases:**
   * - Entity gefunden → Result.ok(RollenBesetzung)
   * - Entity NICHT gefunden → Result.ok(null) - NICHT Result.fail!
   *
   * @param id - Die RollenBesetzungId des gesuchten Aggregates
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenBesetzung | null>
   */
  async findById(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<RollenBesetzung | null>> {
    const client = getTransactionClient(tx, this.prisma);

    try {
      const entity = await client.einsatzRollenbesetzung.findUnique({
        where: { id: id.value },
      });

      if (!entity) {
        return Result.ok(null);
      }

      return PrismaRollenBesetzungMapper.toDomain(entity);
    } catch (error) {
      return this.handlePrismaError(error, 'findById');
    }
  }

  /**
   * Lädt alle AKTIVEN RollenBesetzungen eines Einsatzes.
   *
   * **Use Case:** Dashboard Übersicht - Alle aktiven Besetzungen für Einsatz anzeigen
   *
   * **AC4 (Story 5.2):** Freigegebene Rollen (freigegebenAm != null) werden NICHT
   * mehr in der Liste angezeigt. Nur aktive Besetzungen werden zurückgegeben.
   *
   * @param einsatzId - Einsatz ID
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenBesetzung[]> - Leeres Array wenn keine gefunden
   */
  async findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<RollenBesetzung[]>> {
    const client = getTransactionClient(tx, this.prisma);

    try {
      const entities = await client.einsatzRollenbesetzung.findMany({
        where: {
          einsatzId: einsatzId.value,
          freigegebenAm: null, // AC4: Nur aktive Besetzungen (nicht freigegeben)
        },
        orderBy: { createdAt: 'asc' },
      });

      const aggregates: RollenBesetzung[] = [];
      for (const entity of entities) {
        const result = PrismaRollenBesetzungMapper.toDomain(entity);
        if (result.isFailure) {
          this.logger.warn(`Failed to map RollenBesetzung ${entity.id}: ${result.error}`, 'RollenBesetzungRepository');
          continue; // Skip invalid entities, log warning
        }
        if (result.value) {
          aggregates.push(result.value);
        }
      }

      return Result.ok(aggregates);
    } catch (error) {
      return this.handlePrismaError(error, 'findByEinsatzId');
    }
  }

  /**
   * Lädt AKTIVE RollenBesetzung für spezifische Rolle im Einsatz.
   *
   * **Use Case:** Validierung ob Rolle bereits AKTIV besetzt (AC2 Unique Constraint)
   * Wird vor BesetzeRolle aufgerufen um User-freundliche Fehlermeldung zu zeigen.
   *
   * **Story 5.2:** Freigegebene Besetzungen (freigegebenAm != null) werden ignoriert.
   * Ermöglicht Re-Besetzung einer Rolle nach Freigabe.
   *
   * @param einsatzId - Einsatz ID
   * @param rolleId - RollenDefinition ID
   * @param tx - Optional: Transaction Context
   * @returns Result<RollenBesetzung | null>
   */
  async findByEinsatzIdAndRolleId(einsatzId: EinsatzId, rolleId: RolleId, tx?: TransactionContext): Promise<Result<RollenBesetzung | null>> {
    const client = getTransactionClient(tx, this.prisma);

    try {
      // NOTE: Kann nicht findUnique verwenden da wir freigegebenAm filtern müssen
      const entity = await client.einsatzRollenbesetzung.findFirst({
        where: {
          einsatzId: einsatzId.value,
          rollenDefinitionId: rolleId.value,
          freigegebenAm: null, // Nur aktive Besetzungen
        },
      });

      if (!entity) {
        return Result.ok(null);
      }

      return PrismaRollenBesetzungMapper.toDomain(entity);
    } catch (error) {
      return this.handlePrismaError(error, 'findByEinsatzIdAndRolleId');
    }
  }

  /**
   * Löscht RollenBesetzung (Rolle freigeben).
   *
   * **Use Case:** Rolle freigeben bei Neu-Besetzung oder manueller Freigabe
   *
   * @param id - RollenBesetzungId
   * @param tx - Optional: Transaction Context
   * @returns Result<void>
   */
  async delete(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<void>> {
    const client = getTransactionClient(tx, this.prisma);

    try {
      await client.einsatzRollenbesetzung.delete({
        where: { id: id.value },
      });
      return Result.ok(undefined);
    } catch (error) {
      return this.handlePrismaError(error, 'delete');
    }
  }

  /**
   * Zentrale Prisma Error Handling Methode.
   *
   * **Error Mapping (AC4 - Result Pattern):**
   * - P2002 (Unique Violation) → ROLLE_ALREADY_BESETZT
   * - P2003 (FK Violation) → PERSON_NOT_FOUND / ROLLE_NOT_FOUND basierend auf field_name
   * - P2025 (Record not found) → entsprechender NOT_FOUND Code
   * - Andere Errors → Rethrow (Programming Error)
   *
   * @param error - Der aufgetretene Fehler
   * @param operation - Name der Operation für Logging
   * @returns Result.fail mit entsprechendem Error Code
   * @throws Bei unbekannten Fehlern (Programming Errors)
   */
  private handlePrismaError(error: unknown, operation: string): Result<never> {
    // P2002: Unique Constraint Violation (Rolle bereits besetzt)
    if (isPrismaError(error, 'P2002')) {
      this.logger.warn(`[${operation}] Unique constraint violation - Rolle bereits besetzt`, 'RollenBesetzungRepository');
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT);
    }

    // P2003: Foreign Key Constraint Violation
    if (isPrismaError(error, 'P2003')) {
      const prismaError = error as { meta?: { field_name?: string } };
      const fieldName = prismaError.meta?.field_name ?? '';

      if (fieldName.includes('personId') || fieldName.includes('person')) {
        this.logger.warn(`[${operation}] FK violation - Person not found`, 'RollenBesetzungRepository');
        return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND);
      }

      if (fieldName.includes('rollenDefinitionId') || fieldName.includes('rolle')) {
        this.logger.warn(`[${operation}] FK violation - RollenDefinition not found`, 'RollenBesetzungRepository');
        return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND);
      }

      // Default FK error (z.B. einsatzId)
      this.logger.warn(`[${operation}] FK violation - Invalid einsatz context`, 'RollenBesetzungRepository');
      return Result.fail(ROLLEN_BESETZUNG_ERROR_CODES.INVALID_EINSATZ_CONTEXT);
    }

    // P2025: Record not found (für Update/Delete)
    if (isPrismaError(error, 'P2025')) {
      this.logger.warn(`[${operation}] Record not found`, 'RollenBesetzungRepository');
      return Result.fail('RECORD_NOT_FOUND');
    }

    // Unbekannter Fehler → Rethrow (Programming Error)
    this.logger.error(`[RollenBesetzungRepository] [${operation}] Unexpected database error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
