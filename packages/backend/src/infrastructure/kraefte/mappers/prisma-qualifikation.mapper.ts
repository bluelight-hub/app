import type { Qualifikation as PrismaQualifikation } from '@prisma/client';
import { Qualifikation, type QualifikationKategorie } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import { Result } from '@domain/common/result';

/**
 * Mapper zwischen Prisma Qualifikation Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 */
export class PrismaQualifikationMapper {
  /**
   * Mappt Domain Aggregate zu Prisma Persistence Data.
   *
   * **WICHTIG:** createdAt/updatedAt werden von Prisma automatisch verwaltet
   * und sind NICHT in diesem Return-Typ enthalten (siehe Omit<>).
   * Diese Felder werden bei create/update durch Prisma @default() und @updatedAt gesetzt.
   *
   * @param aggregate - Das Qualifikation Domain Aggregate
   * @returns Prisma-kompatibles Datenobjekt (ohne rollenQualifikationen, createdAt, updatedAt)
   */
  static toPersistence(aggregate: Qualifikation): Omit<PrismaQualifikation, 'rollenQualifikationen' | 'createdAt' | 'updatedAt'> {
    return {
      id: aggregate.id.value,
      name: aggregate.name,
      abkuerzung: aggregate.abkuerzung,
      kategorie: aggregate.kategorie,
      beschreibung: aggregate.beschreibung ?? null,
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<Qualifikation> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **Erwartete Fehlerszenarien:**
   * - Ungültige Kategorie (nicht in QualifikationKategorie Enum)
   * - Fehlende Pflichtfelder (sollte durch DB Constraints verhindert werden)
   * - Dateninkonsistenz (z.B. negative sortOrder, wenn Business Logic das verbietet)
   *
   * @param entity - Prisma Qualifikation Entity
   * @returns Result<Qualifikation> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaQualifikation): Result<Qualifikation> {
    const result = Qualifikation.reconstitute({
      id: entity.id,
      name: entity.name,
      abkuerzung: entity.abkuerzung,
      kategorie: entity.kategorie as QualifikationKategorie,
      beschreibung: entity.beschreibung ?? undefined,
      istAktiv: entity.istAktiv,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy ?? undefined,
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<Qualifikation>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<Qualifikation>(result.value);
  }
}
