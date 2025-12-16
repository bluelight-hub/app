import type { RollenDefinition } from '@domain/kraefte/aggregates/rollen-definition.aggregate';
import type { RollenDefinitionDto } from '../dto/rollen-definition.dto';

/**
 * Mapper von RollenDefinition Aggregate zu RollenDefinitionDto.
 *
 * Wird in Query Handlers verwendet um Domain Aggregates zu Response DTOs zu mappen.
 */
export class RollenDefinitionQueryMapper {
  /**
   * Mappt ein RollenDefinition Aggregate zu einem RollenDefinitionDto.
   *
   * **WICHTIG:** erforderlicheQualifikationen wird als leeres Array zurückgegeben.
   * - Story 1-3: Nur Rollen-CRUD, keine Qualifikations-Auflösung
   * - Story 1-4: M:N-Auflösung implementieren (Qualifikation-Details laden via Repository Join)
   *
   * **WARUM leeres Array statt partial mapping?**
   * - ErforderlicheQualifikationDto benötigt qualifikationName + qualifikationAbkuerzung
   * - Diese Felder sind NICHT im Aggregate (nur qualifikationId + istPflicht)
   * - Query Handler müsste IQualifikationRepository injizieren für Name-Auflösung
   * - Für Story 1-3: Leeres Array vermeidet Breaking Changes (API-Contract bleibt stabil)
   * - Story 1-4: Komplette Implementierung mit Repository-Join
   *
   * @param aggregate - Das RollenDefinition Aggregate
   * @returns RollenDefinitionDto - Response DTO mit allen Feldern
   */
  static toDto(aggregate: RollenDefinition): RollenDefinitionDto {
    return {
      id: aggregate.id.value,
      name: aggregate.name,
      funkrufname: aggregate.funkrufname,
      beschreibung: aggregate.beschreibung,
      istAktiv: aggregate.istAktiv,
      sortOrder: aggregate.sortOrder,
      // TODO Story 1-4: Qualifikations-Details auflösen (M:N-Join mit IQualifikationRepository)
      // Für jetzt: leeres Array (kein Breaking Change in API, Frontend zeigt "Keine Qualifikationen erforderlich")
      erforderlicheQualifikationen: [],
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
    };
  }
}
