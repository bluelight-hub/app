import type { Prisma, StammFahrzeug as PrismaStammFahrzeug, Fahrzeugtyp } from '@prisma/client';
import { StammFahrzeug } from '@domain/kraefte/aggregates/stamm-fahrzeug.aggregate';
import { StammFahrzeugId } from '@domain/kraefte/value-objects/stamm-fahrzeug-id';
import { Result } from '@domain/common/result';

/**
 * Prisma Entity mit eager-loaded Fahrzeugtyp Relation.
 *
 * **Use Case:** Repository lädt StammFahrzeug mit `include: { fahrzeugtyp: true }`
 * um Frontend DTO mit verschachteltem FahrzeugtypDto zu bauen.
 */
export type PrismaStammFahrzeugWithRelations = PrismaStammFahrzeug & {
  fahrzeugtyp: Fahrzeugtyp;
};

/**
 * Mapper zwischen Prisma StammFahrzeug Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **KRITISCH: NULL → undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 */
export class PrismaStammFahrzeugMapper {
  /**
   * Mappt Domain Aggregate zu Prisma Persistence Data.
   *
   * **WICHTIG:** createdAt/updatedAt werden von Prisma automatisch verwaltet
   * und sind NICHT in diesem Return-Typ enthalten.
   * Diese Felder werden bei create/update durch Prisma @default() und @updatedAt gesetzt.
   *
   * **Optional Field Handling:**
   * - kennzeichen, baujahr, funkkenungBOS sind optional
   * - undefined → null für DB NULL (Prisma erwartet null statt undefined)
   * - archivedAt, archivedBy, updatedBy sind ebenfalls optional
   *
   * @param aggregate - Das StammFahrzeug Domain Aggregate
   * @returns {Prisma.StammFahrzeugUncheckedCreateInput} Prisma-kompatibles Datenobjekt
   */
  static toPersistence(aggregate: StammFahrzeug): Prisma.StammFahrzeugUncheckedCreateInput {
    return {
      id: aggregate.id.value,
      rufname: aggregate.rufname,
      funkrufname: aggregate.funkrufname,
      fahrzeugtypId: aggregate.fahrzeugtypId,
      kennzeichen: aggregate.kennzeichen ?? null,
      baujahr: aggregate.baujahr ?? null,
      funkkenungBOS: aggregate.funkkenungBOS ?? null,
      archivedAt: aggregate.archivedAt ?? null,
      archivedBy: aggregate.archivedBy ?? null,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<StammFahrzeug> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **Erwartete Fehlerszenarien:**
   * - Fehlende Pflichtfelder (sollte durch DB Constraints verhindert werden)
   * - Dateninkonsistenz (z.B. ungültige ID-Formate)
   * - Ungültiger Fahrzeugtyp-Bezug (FK-Constraint sollte dies verhindern)
   *
   * **KRITISCH: NULL → undefined Konvertierung für ALLE optionalen Felder!**
   * - kennzeichen: string | null → string | undefined
   * - baujahr: number | null → number | undefined
   * - funkkenungBOS: string | null → string | undefined
   * - archivedAt: Date | null → Date | undefined
   * - archivedBy: string | null → string | undefined
   * - updatedBy: string | null → string | undefined
   *
   * **Warum Type Assertion `as T | null`?**
   * - Prisma typisiert optionale Felder als `T | null`
   * - TypeScript strict mode erkennt das, aber explizite Assertion macht es deutlich
   * - Verhindert Type-Inferenz-Bugs bei Prisma Schema Änderungen
   *
   * @param entity - Prisma StammFahrzeug Entity mit Fahrzeugtyp Relation
   * @returns Result<StammFahrzeug> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaStammFahrzeugWithRelations): Result<StammFahrzeug> {
    const result = StammFahrzeug.reconstitute({
      id: entity.id,
      rufname: entity.rufname,
      funkrufname: entity.funkrufname,
      fahrzeugtypId: entity.fahrzeugtypId,
      // KRITISCH: NULL → undefined für ALLE optionalen Felder!
      kennzeichen: (entity.kennzeichen as string | null) ?? undefined,
      baujahr: (entity.baujahr as number | null) ?? undefined,
      funkkenungBOS: (entity.funkkenungBOS as string | null) ?? undefined,
      archivedAt: (entity.archivedAt as Date | null) ?? undefined,
      archivedBy: (entity.archivedBy as string | null) ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: (entity.updatedBy as string | null) ?? undefined,
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<StammFahrzeug>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<StammFahrzeug>(result.value);
  }
}
