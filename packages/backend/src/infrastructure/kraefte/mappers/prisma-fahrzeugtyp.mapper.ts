import type { Fahrzeugtyp as PrismaFahrzeugtyp, FahrzeugtypKategorie as PrismaFahrzeugtypKategorie, Prisma } from '@/generated/prisma/client';
import { Fahrzeugtyp, type SollbesatzungSchema } from '@domain/kraefte/aggregates/fahrzeugtyp.aggregate';
import { Result } from '@domain/common/result';

/**
 * Mapper zwischen Prisma Fahrzeugtyp Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 */
export class PrismaFahrzeugtypMapper {
  /**
   * Mappt Domain Aggregate zu Prisma Persistence Data.
   *
   * **WICHTIG:** createdAt/updatedAt werden von Prisma automatisch verwaltet
   * und sind NICHT in diesem Return-Typ enthalten (siehe Omit<>).
   * Diese Felder werden bei create/update durch Prisma @default() und @updatedAt gesetzt.
   *
   * **Sollbesatzung Handling:**
   * - sollbesatzung ist optional (kann undefined sein)
   * - Prisma erwartet null statt undefined (DB NULL)
   * - JSON wird als Prisma.JsonValue gespeichert (JsonB Spaltentyp)
   *
   * @param aggregate - Das Fahrzeugtyp Domain Aggregate
   * @returns {Omit<PrismaFahrzeugtyp, 'createdAt' | 'updatedAt' | 'creator' | 'updater'>} Prisma-kompatibles Datenobjekt ohne auto-verwaltete Felder
   */
  static toPersistence(aggregate: Fahrzeugtyp): Omit<PrismaFahrzeugtyp, 'createdAt' | 'updatedAt' | 'creator' | 'updater'> {
    return {
      id: aggregate.id.value,
      code: aggregate.code, // Bereits UPPERCASE aus Aggregate
      bezeichnung: aggregate.bezeichnung,
      kategorie: aggregate.kategorieValue as PrismaFahrzeugtypKategorie, // Value Object → Prisma ENUM
      beschreibung: aggregate.beschreibung ?? null,
      sollbesatzung: (aggregate.sollbesatzung ?? null) as Prisma.JsonValue, // undefined → null für DB NULL, cast to JsonValue
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<Fahrzeugtyp> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **Erwartete Fehlerszenarien:**
   * - Ungültige Kategorie (nicht in FahrzeugtypKategorie Enum)
   * - Fehlende Pflichtfelder (sollte durch DB Constraints verhindert werden)
   * - Dateninkonsistenz (z.B. negative sortOrder, wenn Business Logic das verbietet)
   *
   * **Sollbesatzung Handling:**
   * - DB NULL (null) wird zu undefined konvertiert (Domain Layer Konvention)
   * - JSON wird als SollbesatzungSchema typisiert
   * - Prisma liefert Prisma.JsonValue, wir casten zu SollbesatzungSchema
   *
   * @param entity - Prisma Fahrzeugtyp Entity
   * @returns Result<Fahrzeugtyp> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaFahrzeugtyp): Result<Fahrzeugtyp> {
    const result = Fahrzeugtyp.reconstitute({
      id: entity.id,
      code: entity.code, // Bereits UPPERCASE aus DB
      bezeichnung: entity.bezeichnung,
      kategorie: entity.kategorie, // String → wird intern im Aggregate zu Value Object
      beschreibung: entity.beschreibung ?? undefined,
      sollbesatzung: (entity.sollbesatzung as SollbesatzungSchema | null) ?? undefined, // JsonValue → SollbesatzungSchema (NULL → undefined)
      istAktiv: entity.istAktiv,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy ?? undefined,
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<Fahrzeugtyp>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<Fahrzeugtyp>(result.value);
  }
}
