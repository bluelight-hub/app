import { Injectable, Inject } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import type { TransactionContext } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { PrismaEinsatzEinheitMapper } from '@infrastructure/kraefte';
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';
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
 * Prisma Implementation des IEinsatzEinheitRepository (Hexagonal Architecture).
 *
 * Implementiert das Domain Repository Port Interface mit Prisma ORM.
 * Teil der Infrastructure Layer und damit austauschbar.
 *
 * **Persistence Strategy:**
 * - Upsert Pattern für save() (Create oder Update)
 * - Result Pattern für explizite Fehlerbehandlung
 * - "Not found" ist SUCCESS mit null (kein FAILURE)
 *
 * **Transaction Support (Outbox Pattern):**
 * - tx Parameter für atomare Multi-Aggregate Operations
 * - Wenn tx=undefined: Verwendet interne Prisma Client
 * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 * - TransactionContext ist framework-agnostisch (wird zu PrismaTransactionClient gecastet)
 *
 * **Unique Constraint Handling:**
 * - UNIQUE(einsatzId, name) in DB
 * - P2002 Error -> Result.fail mit DUPLICATE_NAME Code
 * - Keine Exception werfen für erwartete Business-Fehler
 *
 * **Personen-Zuordnung (M:N):**
 * - EinsatzPersonEinheit Junction Table
 * - savePersonenZuordnung() / removePersonenZuordnung() für M:N Verwaltung
 * - existsPersonenZuordnung() für Duplikat-Prüfung
 */
@Injectable()
export class PrismaEinsatzEinheitRepository implements IEinsatzEinheitRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Speichert das EinsatzEinheit-Aggregat (Upsert: Create oder Update).
   *
   * **Constraint Handling (Result Pattern statt Exception):**
   * - P2002: Unique Constraint Violation (Name pro Einsatz bereits vergeben)
   * - P2003: Foreign Key Constraint (einsatzId, parentId, einheitenfuehrerId existiert nicht)
   *
   * **Immutable Fields bei Update:**
   * - einsatzId wird beim Update NICHT mitgesendet (immutabel)
   *
   * @param einheit - Das zu speichernde EinsatzEinheit Aggregate
   * @param tx - Transaction Context für atomare Multi-Aggregate Operationen
   * @returns Result<void> - Success (void) oder Failure mit Fehlermeldung
   */
  async save(einheit: EinsatzEinheit, tx: TransactionContext): Promise<Result<void>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      await client.einsatzEinheit.upsert({
        where: { id: einheit.id.value },
        create: {
          id: einheit.id.value,
          einsatzId: einheit.einsatzId,
          parentId: einheit.parentId ?? null,
          name: einheit.name,
          typ: einheit.typ,
          funktion: einheit.funktion ?? null,
          status: einheit.status,
          einheitenfuehrerId: einheit.einheitenfuehrerId ?? null,
          sollStaerke: einheit.sollStaerke,
          auftrag: einheit.auftrag ?? null,
          einsatzort: einheit.einsatzort ?? null,
          createdBy: einheit.createdBy,
          updatedBy: einheit.updatedBy ?? null,
        },
        update: {
          // einsatzId ist IMMUTABLE (FK zum Einsatz)
          parentId: einheit.parentId ?? null,
          name: einheit.name,
          typ: einheit.typ,
          funktion: einheit.funktion ?? null,
          status: einheit.status,
          einheitenfuehrerId: einheit.einheitenfuehrerId ?? null,
          sollStaerke: einheit.sollStaerke,
          auftrag: einheit.auftrag ?? null,
          einsatzort: einheit.einsatzort ?? null,
          updatedBy: einheit.updatedBy ?? null,
          // id, createdAt, createdBy sind immutabel
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint Violation (einsatzId, name)
      if (isPrismaError(error, 'P2002')) {
        return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.DUPLICATE_NAME, 'Eine Einheit mit diesem Namen existiert bereits in diesem Einsatz'));
      }

      // P2003: Foreign Key Constraint Failed
      if (isPrismaError(error, 'P2003')) {
        const meta = typeof error === 'object' && error !== null && 'meta' in error ? error.meta : undefined;
        const fieldName = meta && typeof meta === 'object' && 'field_name' in meta ? meta.field_name : 'unknown';

        if (String(fieldName).includes('einsatz_id') || String(fieldName).includes('einsatzId')) {
          return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND, 'Einsatz nicht gefunden'));
        }
        if (String(fieldName).includes('parent_id') || String(fieldName).includes('parentId')) {
          return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND, 'Übergeordnete Einheit nicht gefunden'));
        }
        if (String(fieldName).includes('einheitenfuehrer_id') || String(fieldName).includes('einheitenfuehrerId')) {
          return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.FUEHRER_NOT_FOUND, 'Einheitenführer (Person) nicht gefunden'));
        }
      }

      // Andere Fehler sind Programming Errors -> Exception werfen
      throw error;
    }
  }

  /**
   * Findet eine EinsatzEinheit nach ID.
   *
   * **Result Semantik:** "Not found" ist SUCCESS mit null (kein FAILURE).
   *
   * **Eager Loading:** Lädt _count.personen für istStaerke Berechnung.
   *
   * @param id - Die EinsatzEinheit-ID (CUID2 String)
   * @param tx - Optional: Transaction Context
   * @returns Result<EinsatzEinheit | null> - Success mit Aggregate oder null, Failure bei DB-Fehler
   */
  async findById(id: string, tx?: TransactionContext): Promise<Result<EinsatzEinheit | null>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      const entity = await client.einsatzEinheit.findUnique({
        where: { id },
        include: {
          _count: {
            select: { personen: true },
          },
        },
      });

      if (!entity) {
        return Result.ok<EinsatzEinheit | null>(null);
      }

      const props = PrismaEinsatzEinheitMapper.toDomain(entity);
      const domainResult = EinsatzEinheit.reconstitute(props);
      if (domainResult.isFailure || !domainResult.value) {
        return Result.fail<EinsatzEinheit | null>(`Fehler beim Laden der Einsatz-Einheit: ${domainResult.error}`);
      }

      return Result.ok<EinsatzEinheit | null>(domainResult.value);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzEinheit | null>(`Fehler beim Laden der Einsatz-Einheit: ${errorMessage}`);
    }
  }

  /**
   * Findet alle EinsatzEinheiten eines Einsatzes.
   *
   * **Sortierung:** Nach Name ASC (alphabetisch).
   *
   * **Performance:** Nutzt Index auf einsatzId.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @returns Result<EinsatzEinheit[]> - Success mit Array (kann leer sein), Failure bei DB-Fehler
   */
  async findByEinsatzId(einsatzId: string): Promise<Result<EinsatzEinheit[]>> {
    try {
      const entities = await this.prisma.einsatzEinheit.findMany({
        where: { einsatzId },
        include: {
          _count: {
            select: { personen: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Batch-Rekonstitution mit Error-Handling
      const aggregates: EinsatzEinheit[] = [];
      for (const entity of entities) {
        const props = PrismaEinsatzEinheitMapper.toDomain(entity);
        const domainResult = EinsatzEinheit.reconstitute(props);
        if (domainResult.isFailure || !domainResult.value) {
          // WICHTIG: Ein fehlerhaftes Entity bricht NICHT die ganze Query ab
          this.logger.warn(
            `Einsatz-Einheit Rekonstitution fehlgeschlagen für ID ${entity.id}: ${domainResult.error ?? 'Unbekannter Fehler'} (einsatzId=${einsatzId})`,
            'PrismaEinsatzEinheitRepository',
          );
          continue;
        }
        aggregates.push(domainResult.value);
      }

      return Result.ok<EinsatzEinheit[]>(aggregates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<EinsatzEinheit[]>(`Fehler beim Laden der Einsatz-Einheiten: ${errorMessage}`);
    }
  }

  /**
   * Löscht eine EinsatzEinheit nach ID.
   *
   * **Voraussetzungen (müssen vom Handler geprüft werden):**
   * - Keine untergeordneten Einheiten (countChildren === 0)
   * - Keine zugewiesenen Personen (countPersonen === 0)
   *
   * @param id - Die EinsatzEinheit-ID (CUID2 String)
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  async delete(id: string, tx: TransactionContext): Promise<Result<void>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      await client.einsatzEinheit.delete({
        where: { id },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<void>(`Fehler beim Löschen der Einsatz-Einheit: ${errorMessage}`);
    }
  }

  /**
   * Prüft ob eine Personen-Zuordnung bereits existiert.
   *
   * @param personId - Die EinsatzPerson-ID
   * @param einheitId - Die Einheit-ID
   * @param tx - Optional: Transaction Context
   * @returns true wenn Zuordnung existiert
   */
  async existsPersonenZuordnung(personId: string, einheitId: string, tx?: TransactionContext): Promise<boolean> {
    const client = getTransactionClient(tx, this.prisma);

    const entity = await client.einsatzPersonEinheit.findFirst({
      where: { einheitId, einsatzPersonId: personId },
      select: { id: true },
    });

    return entity !== null;
  }

  /**
   * Speichert eine Personen-Zuordnung (EinsatzPersonEinheit Junction Record).
   *
   * @param personId - Die EinsatzPerson-ID
   * @param einheitId - Die Einheit-ID
   * @param createdBy - User der die Zuordnung erstellt hat
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  async savePersonenZuordnung(personId: string, einheitId: string, createdBy: string, tx: TransactionContext): Promise<Result<void>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      await client.einsatzPersonEinheit.create({
        data: {
          einheitId,
          einsatzPersonId: personId,
          createdBy,
          updatedBy: createdBy,
        },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      // P2002: Unique Constraint (einheitId, einsatzPersonId) - Person bereits zugewiesen
      if (isPrismaError(error, 'P2002')) {
        return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_ALREADY_ASSIGNED, 'Person ist bereits dieser Einheit zugewiesen'));
      }

      // P2003: Foreign Key Constraint - Einheit oder Person existiert nicht
      if (isPrismaError(error, 'P2003')) {
        return Result.fail<void>(EinsatzEinheitError.format(EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND, 'Einheit oder Person nicht gefunden'));
      }

      throw error;
    }
  }

  /**
   * Entfernt eine Personen-Zuordnung (EinsatzPersonEinheit Junction Record).
   *
   * @param personId - Die EinsatzPerson-ID
   * @param einheitId - Die Einheit-ID
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  async removePersonenZuordnung(personId: string, einheitId: string, tx: TransactionContext): Promise<Result<void>> {
    try {
      const client = getTransactionClient(tx, this.prisma);

      await client.einsatzPersonEinheit.deleteMany({
        where: { einheitId, einsatzPersonId: personId },
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail<void>(`Fehler beim Entfernen der Personen-Zuordnung: ${errorMessage}`);
    }
  }

  /**
   * Zählt die untergeordneten Einheiten einer Einheit.
   *
   * **Use Case:** Prüfung vor Löschung (keine Kinder erlaubt).
   *
   * @param einheitId - Die Einheit-ID (parentId für count)
   * @param tx - Optional: Transaction Context
   * @returns Anzahl der Kinder
   */
  async countChildren(einheitId: string, tx?: TransactionContext): Promise<number> {
    const client = getTransactionClient(tx, this.prisma);

    return client.einsatzEinheit.count({
      where: { parentId: einheitId },
    });
  }

  /**
   * Zählt die zugewiesenen Personen einer Einheit.
   *
   * **Use Case:** Prüfung vor Löschung (keine Personen erlaubt).
   *
   * @param einheitId - Die Einheit-ID
   * @param tx - Optional: Transaction Context
   * @returns Anzahl der Personen
   */
  async countPersonen(einheitId: string, tx?: TransactionContext): Promise<number> {
    const client = getTransactionClient(tx, this.prisma);

    return client.einsatzPersonEinheit.count({
      where: { einheitId },
    });
  }
}
