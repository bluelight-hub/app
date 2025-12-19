import { Prisma } from '@prisma/client';
import type { EinsatzPerson as PrismaEinsatzPerson } from '@prisma/client';
import { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import { Result } from '@domain/common/result';
import { nullToUndefined } from '@/shared/utils/type-utils';

/**
 * Prisma Entity mit eager-loaded Qualifikationen Relation.
 *
 * **Use Case:** Repository lädt EinsatzPerson mit `include: { qualifikationen: { select: { qualifikationId: true } } }`
 * um Domain Aggregate mit Qualifikation-IDs zu rekonstruieren.
 *
 * **M:N Handling:** Qualifikationen werden als Array von Junction Table Records geladen.
 * **Performance:** Lädt nur qualifikationId (nicht alle 7 Felder) für optimale Performance.
 */
export type PrismaEinsatzPersonWithRelations = PrismaEinsatzPerson & {
  qualifikationen?: Array<{
    qualifikationId: string;
  }>;
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
 * Mapper zwischen Prisma EinsatzPerson Entity und Domain Aggregate.
 *
 * **Hexagonal Architecture:** Übersetzt zwischen Infrastructure Layer (Prisma)
 * und Domain Layer (Aggregate). Hält die Domain Layer frei von Prisma-Typen.
 *
 * **KRITISCH: NULL → undefined Konvertierung!**
 * - Prisma gibt `null` für optionale Felder zurück (DB NULL)
 * - Domain Layer verwendet `undefined` (TypeScript Konvention)
 * - ALLE optionalen Felder müssen explizit konvertiert werden
 *
 * **M:N Qualifikationen Handling:**
 * - DB speichert M:N via Junction Table EinsatzPersonQualifikation
 * - Domain Layer nutzt Array von Qualifikation-IDs (string[])
 * - Mapper extrahiert IDs aus Junction Table Records
 *
 * **Position JSONB Handling:**
 * - DB speichert Position als JSONB: `{ lat: number, lng: number }`
 * - Domain Layer nutzt GeoPosition Value Object
 * - Mapper konvertiert zwischen JSON und GeoPosition
 */
export class PrismaEinsatzPersonMapper {
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
   * **Qualifikationen:**
   * - NICHT in diesem Return-Typ enthalten
   * - Werden separat in save() über nested create/delete gehandhabt
   *
   * @param aggregate - Das EinsatzPerson Domain Aggregate
   * @returns {Prisma.EinsatzPersonUncheckedCreateInput} Prisma-kompatibles Datenobjekt
   */
  static toPersistence(aggregate: EinsatzPerson): Prisma.EinsatzPersonUncheckedCreateInput {
    return {
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId,
      stammId: aggregate.stammId ?? null,
      vorname: aggregate.vorname,
      nachname: aggregate.nachname,
      funktion: aggregate.funktion,
      funkrufname: aggregate.funkrufname ?? null,
      // Position: GeoPosition → JSON Object oder undefined (Prisma default)
      position: aggregate.position ? (aggregate.position.toJSON() as Prisma.InputJsonValue) : Prisma.DbNull,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy ?? null,
    };
  }

  /**
   * Mappt Prisma Entity zu Domain Aggregate (Hydration).
   *
   * **Error Handling (Result Pattern):** Diese Methode gibt Result<EinsatzPerson> zurück
   * statt Exception zu werfen. Der Caller im Repository kann dann entscheiden,
   * ob ein Fehler bei der Rekonstitution ein Programming Error (throw) oder
   * ein Business Error (Result.fail) ist.
   *
   * **KRITISCH: NULL → undefined Konvertierung für ALLE optionalen Felder!**
   * - stammId: string | null → string | undefined
   * - funkrufname: string | null → string | undefined
   * - position: Json | null → { lat, lng } | undefined
   * - updatedBy: string | null → string | undefined
   *
   * **M:N Qualifikationen Extraktion:**
   * - qualifikationen: Array<{ qualifikationId: string }> → string[]
   * - Falls qualifikationen = undefined: leeres Array
   *
   * **Position Deserialisierung:**
   * - DB JSONB → JavaScript Object
   * - Validierung dass lat/lng vorhanden sind
   * - null → undefined
   *
   * @param entity - Prisma EinsatzPerson Entity mit Qualifikationen Relation
   * @returns Result<EinsatzPerson> - Success mit Aggregate oder Failure mit Fehlermeldung
   */
  static toDomain(entity: PrismaEinsatzPersonWithRelations): Result<EinsatzPerson> {
    // Position: JSON → GeoPosition Props oder undefined
    let positionProps: { lat: number; lng: number } | undefined;
    if (entity.position !== null && typeof entity.position === 'object' && !Array.isArray(entity.position)) {
      const posJson = entity.position as unknown as PositionJson;
      if (typeof posJson.lat === 'number' && typeof posJson.lng === 'number') {
        positionProps = { lat: posJson.lat, lng: posJson.lng };
      }
    }

    // Qualifikationen: Junction Table Records → IDs Array
    const qualifikationIds: string[] = entity.qualifikationen ? entity.qualifikationen.map((q) => q.qualifikationId) : [];

    const result = EinsatzPerson.reconstitute({
      id: entity.id,
      einsatzId: entity.einsatzId,
      // KRITISCH: NULL → undefined für optionale Felder!
      stammId: nullToUndefined(entity.stammId),
      vorname: entity.vorname,
      nachname: entity.nachname,
      funktion: entity.funktion,
      funkrufname: nullToUndefined(entity.funkrufname),
      qualifikationIds: qualifikationIds,
      position: positionProps,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      updatedBy: nullToUndefined(entity.updatedBy),
    });

    if (result.isFailure || !result.value) {
      // Dateninkonsistenz in DB - Caller entscheidet über Handling
      return Result.fail<EinsatzPerson>(`Rekonstitution fehlgeschlagen: ${result.error ?? 'Unbekannter Fehler'}`);
    }

    return Result.ok<EinsatzPerson>(result.value);
  }
}
