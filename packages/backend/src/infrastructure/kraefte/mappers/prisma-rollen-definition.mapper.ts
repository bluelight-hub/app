import type { RollenDefinition as PrismaRollenDefinition, RolleQualifikation as PrismaRolleQualifikation } from '@/generated/prisma/client';
import { RollenDefinition, type ErforderlicheQualifikation } from '@domain/kraefte/aggregates/rollen-definition.aggregate';
import { Result } from '@domain/common/result';

/**
 * Prisma Entity mit includierten Beziehungen (M:N Junction Records).
 */
type PrismaRollenDefinitionWithQualifikationen = PrismaRollenDefinition & {
  erforderlicheQualifikationen: PrismaRolleQualifikation[];
};

/**
 * Mapper zwischen Prisma RollenDefinition Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **M:N Relationship Handling:**
 * - `toDomain()` nimmt Prisma Entity mit includierten `erforderlicheQualifikationen` (Junction Records)
 * - Mappt Junction Records (RolleQualifikation) zu Embedded Value Objects (ErforderlicheQualifikation)
 * - `toPersistence()` gibt nur Stammdaten zurück (keine Beziehungen)
 * - Junction Records werden separat über Repository-Methoden verwaltet (saveQualifikationen/deleteQualifikationen)
 */
export class PrismaRollenDefinitionMapper {
  /**
   * Mappt Domain Aggregate zu Prisma Persistence Data.
   *
   * **WICHTIG:** createdAt/updatedAt werden von Prisma automatisch verwaltet
   * und sind NICHT in diesem Return-Typ enthalten (siehe Omit<>).
   * Diese Felder werden bei create/update durch Prisma @default() und @updatedAt gesetzt.
   *
   * **WARUM erforderlicheQualifikationen ausgeschlossen werden:**
   * - M:N-Beziehungen werden über separate Junction Table (RolleQualifikation) verwaltet
   * - Lazy Loading Pattern: Beziehungen werden nur bei Bedarf geladen
   * - Performance: Vermeidung von N+1 Query-Problemen bei Bulk-Operationen
   * - Single Responsibility: Dieser Mapper verwaltet nur RollenDefinition-Stammdaten
   * - Beziehungen werden separat über Repository-Methoden verwaltet (saveQualifikationen/deleteQualifikationen)
   *
   * @param aggregate - Das RollenDefinition Domain Aggregate
   * @returns Prisma-kompatibles Datenobjekt (ohne erforderlicheQualifikationen, createdAt, updatedAt)
   */
  static toPersistence(aggregate: RollenDefinition): Omit<PrismaRollenDefinition, 'erforderlicheQualifikationen' | 'createdAt' | 'updatedAt'> {
    return {
      id: aggregate.id.value,
      name: aggregate.name,
      funkrufname: aggregate.funkrufname ?? null,
      beschreibung: aggregate.beschreibung ?? null,
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity mit Junction Records zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<RollenDefinition> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **Erwartete Fehlerszenarien:**
   * - Fehlende Pflichtfelder (sollte durch DB Constraints verhindert werden)
   * - Dateninkonsistenz (z.B. negative sortOrder, wenn Business Logic das verbietet)
   * - Ungültige Junction Records (qualifikationId nicht CUID)
   *
   * **M:N Mapping:**
   * - Nimmt `erforderlicheQualifikationen` (Junction Records) aus Prisma Include
   * - Mappt Junction Records (RolleQualifikation) zu Embedded Value Objects (ErforderlicheQualifikation)
   * - Extrahiert nur `qualifikationId` und `istPflicht` (Domain-relevante Felder)
   * - Ignoriert Audit-Felder des Junction Records (createdAt, createdBy) da diese nicht Teil des Domain Models sind
   *
   * @param entity - Prisma RollenDefinition Entity mit includierten erforderlicheQualifikationen
   * @returns Result<RollenDefinition> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaRollenDefinitionWithQualifikationen): Result<RollenDefinition> {
    // Map Junction Records (RolleQualifikation) zu Embedded Value Objects (ErforderlicheQualifikation)
    const erforderlicheQualifikationen: ErforderlicheQualifikation[] = entity.erforderlicheQualifikationen.map((junctionRecord) => ({
      qualifikationId: junctionRecord.qualifikationId,
      istPflicht: junctionRecord.istPflicht,
    }));

    const result = RollenDefinition.reconstitute({
      id: entity.id,
      name: entity.name,
      funkrufname: entity.funkrufname ?? undefined,
      beschreibung: entity.beschreibung ?? undefined,
      istAktiv: entity.istAktiv,
      sortOrder: entity.sortOrder,
      erforderlicheQualifikationen, // Embedded Value Objects
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy ?? undefined,
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<RollenDefinition>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<RollenDefinition>(result.value);
  }
}
