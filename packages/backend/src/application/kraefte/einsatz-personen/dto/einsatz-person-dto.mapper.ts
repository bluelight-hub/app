import type { EinsatzPerson } from '@domain/kraefte/aggregates/einsatz-person.aggregate';
import type { EinsatzPersonResponseDto, EinsatzPersonListItemDto } from './einsatz-person-response.dto';

/**
 * Mapper für EinsatzPerson Domain → Response DTO Transformation.
 *
 * **Verantwortung:**
 * - Transformiert Domain Aggregates in API-Response DTOs
 * - Keine Business Logic (nur Daten-Mapping)
 * - Unterstützt sowohl Full DTOs als auch List-Item DTOs
 *
 * **Pattern:**
 * - Statische Methoden (kein State erforderlich)
 * - Explizite Feld-Mappings (kein Object.assign oder Spread)
 * - ISO 8601 String-Konvertierung für Timestamps
 */
export class EinsatzPersonDtoMapper {
  /**
   * Konvertiert EinsatzPerson Domain Aggregate zu vollständigem Response DTO.
   *
   * @param entity - EinsatzPerson Domain Aggregate
   * @returns EinsatzPersonResponseDto mit allen Feldern
   */
  static toResponseDto(entity: EinsatzPerson): EinsatzPersonResponseDto {
    return {
      id: entity.id.value,
      einsatzId: entity.einsatzId,
      stammId: entity.stammId,
      vorname: entity.vorname,
      nachname: entity.nachname,
      funktion: entity.funktion,
      funkrufname: entity.funkrufname,
      qualifikationIds: entity.qualifikationIds,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      fahrzeugId: entity.fahrzeugId,
    };
  }

  /**
   * Konvertiert Array von EinsatzPerson Aggregates zu Response DTO Array.
   *
   * @param entities - Array von EinsatzPerson Domain Aggregates
   * @returns Array von EinsatzPersonResponseDto
   */
  static toResponseDtoList(entities: EinsatzPerson[]): EinsatzPersonResponseDto[] {
    return entities.map((e) => EinsatzPersonDtoMapper.toResponseDto(e));
  }

  /**
   * Konvertiert EinsatzPerson zu vereinfachtem List-Item DTO.
   *
   * **Use Case:**
   * - Tabellen-Ansichten mit vielen Personen
   * - Reduziert Payload-Size (nur wichtigste Felder)
   *
   * @param entity - EinsatzPerson Domain Aggregate
   * @returns EinsatzPersonListItemDto mit reduzierten Feldern
   */
  static toListItemDto(entity: EinsatzPerson): EinsatzPersonListItemDto {
    return {
      id: entity.id.value,
      name: `${entity.vorname} ${entity.nachname}`,
      funktion: entity.funktion,
      funkrufname: entity.funkrufname,
      stammId: entity.stammId,
    };
  }

  /**
   * Konvertiert Array von EinsatzPerson zu List-Item DTO Array.
   *
   * @param entities - Array von EinsatzPerson Domain Aggregates
   * @returns Array von EinsatzPersonListItemDto
   */
  static toListItemDtoList(entities: EinsatzPerson[]): EinsatzPersonListItemDto[] {
    return entities.map((e) => EinsatzPersonDtoMapper.toListItemDto(e));
  }
}
