import type { Prisma, EinsatzFahrzeug as PrismaEinsatzFahrzeug, Fahrzeugtyp } from '@prisma/client';
import { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { Result } from '@domain/common/result';

/**
 * Prisma Entity mit eager-loaded Fahrzeugtyp Relation.
 *
 * **Use Case:** Repository lädt EinsatzFahrzeug mit `include: { fahrzeugtyp: true }`
 * um Frontend DTO mit verschachteltem FahrzeugtypDto zu bauen.
 */
export type PrismaEinsatzFahrzeugWithRelations = PrismaEinsatzFahrzeug & {
  fahrzeugtyp: Fahrzeugtyp;
};

/**
 * JSON-Struktur für GeoPosition in der DB (JSONB Feld).
 *
 * **DB Schema:** `position Json? @db.JsonB`
 * - Nullable JSONB Feld für GPS-Koordinaten
 * - WGS84 Koordinaten (lat: -90..90, lng: -180..180)
 */
interface PositionJson {
  lat: number;
  lng: number;
}

/**
 * Mapper zwischen Prisma EinsatzFahrzeug Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **KRITISCH: NULL → undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 *
 * **Position JSONB Handling:**
 * - DB speichert Position als JSONB: `{ lat: number, lng: number }`
 * - Domain Layer nutzt GeoPosition Value Object
 * - Mapper konvertiert zwischen JSON und GeoPosition
 */
export class PrismaEinsatzFahrzeugMapper {
  /**
   * Mappt Domain Aggregate zu Prisma Persistence Data.
   *
   * **WICHTIG:** createdAt/updatedAt werden von Prisma automatisch verwaltet
   * und sind NICHT in diesem Return-Typ enthalten.
   *
   * **Position Serialisierung:**
   * - GeoPosition Value Object → JSON Object { lat, lng }
   * - undefined → null für DB NULL
   *
   * @param aggregate - Das EinsatzFahrzeug Domain Aggregate
   * @returns {Prisma.EinsatzFahrzeugUncheckedCreateInput} Prisma-kompatibles Datenobjekt
   */
  static toPersistence(aggregate: EinsatzFahrzeug): Prisma.EinsatzFahrzeugUncheckedCreateInput {
    return {
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId,
      stammId: aggregate.stammId ?? null,
      funkrufname: aggregate.funkrufname,
      kennzeichen: aggregate.kennzeichen ?? null,
      fahrzeugtypId: aggregate.fahrzeugtypId,
      fmsStatus: aggregate.fmsStatus,
      // Position: GeoPosition → JSON Object oder undefined (Prisma default)
      position: aggregate.position ? aggregate.position.toJSON() : undefined,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<EinsatzFahrzeug> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **KRITISCH: NULL → undefined Konvertierung für ALLE optionalen Felder!**
   * - stammId: string | null → string | undefined
   * - kennzeichen: string | null → string | undefined
   * - position: Json | null → { lat, lng } | undefined
   * - updatedBy: string | null → string | undefined
   *
   * **Position Deserialisierung:**
   * - DB JSONB → JavaScript Object
   * - Validierung dass lat/lng vorhanden sind
   * - null → undefined
   *
   * @param entity - Prisma EinsatzFahrzeug Entity mit Fahrzeugtyp Relation
   * @returns Result<EinsatzFahrzeug> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaEinsatzFahrzeugWithRelations): Result<EinsatzFahrzeug> {
    // Position: JSON → GeoPosition Props oder undefined
    let positionProps: { lat: number; lng: number } | undefined;
    if (entity.position !== null && typeof entity.position === 'object' && !Array.isArray(entity.position)) {
      const posJson = entity.position as unknown as PositionJson;
      if (typeof posJson.lat === 'number' && typeof posJson.lng === 'number') {
        positionProps = { lat: posJson.lat, lng: posJson.lng };
      }
    }

    const result = EinsatzFahrzeug.reconstitute({
      id: entity.id,
      einsatzId: entity.einsatzId,
      // KRITISCH: NULL → undefined für optionale Felder!
      stammId: (entity.stammId as string | null) ?? undefined,
      fahrzeugtypId: entity.fahrzeugtypId,
      funkrufname: entity.funkrufname,
      kennzeichen: (entity.kennzeichen as string | null) ?? undefined,
      fmsStatus: entity.fmsStatus,
      position: positionProps,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: (entity.updatedBy as string | null) ?? undefined,
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<EinsatzFahrzeug>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<EinsatzFahrzeug>(result.value);
  }
}
