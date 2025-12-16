import type { Fahrzeugtyp, FahrzeugtypKategorieType } from '@domain/kraefte';
import type { FahrzeugtypDto } from '../dto/fahrzeugtyp.dto';

/**
 * Mapper von Fahrzeugtyp Aggregate zu FahrzeugtypDto.
 *
 * Wird in Query Handlers verwendet um Domain Aggregates zu Response DTOs zu mappen.
 */
export class FahrzeugtypQueryMapper {
  /**
   * Mappt ein Fahrzeugtyp Aggregate zu einem FahrzeugtypDto.
   *
   * Konvertiert kategorie Value Object zu primitiven String für API-Response.
   * Sollbesatzung bleibt als JSONB-Struktur erhalten (ist bereits primitives Object).
   */
  static toDto(aggregate: Fahrzeugtyp): FahrzeugtypDto {
    return {
      id: aggregate.id.value,
      code: aggregate.code,
      bezeichnung: aggregate.bezeichnung,
      kategorie: aggregate.kategorieValue as FahrzeugtypKategorieType, // Value Object → String für DTO
      sollbesatzung: aggregate.sollbesatzung,
      beschreibung: aggregate.beschreibung,
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
    };
  }
}
