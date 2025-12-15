import type { Qualifikation, QualifikationKategorieType } from '@domain/kraefte';
import type { QualifikationDto } from '../dto/qualifikation.dto';

/**
 * Mapper von Qualifikation Aggregate zu QualifikationDto.
 *
 * Wird in Query Handlers verwendet um Domain Aggregates zu Response DTOs zu mappen.
 */
export class QualifikationQueryMapper {
  /**
   * Mappt ein Qualifikation Aggregate zu einem QualifikationDto.
   *
   * Konvertiert kategorie Value Object zu primitiven String für API-Response.
   */
  static toDto(aggregate: Qualifikation): QualifikationDto {
    return {
      id: aggregate.id.value,
      name: aggregate.name,
      abkuerzung: aggregate.abkuerzung,
      kategorie: aggregate.kategorieValue as QualifikationKategorieType, // Value Object → String für DTO
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
