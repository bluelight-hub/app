import type { StammPerson } from '@domain/kraefte/aggregates/stamm-person.aggregate';
import type { Qualifikation } from '@domain/kraefte/aggregates/qualifikation.aggregate';
import type { StammPersonDto, StammPersonQualifikationDto } from '../dto/stamm-person.dto';

/**
 * Qualifikations-Daten mit optionalem Audit-Trail aus Junction Table.
 *
 * Wird vom Query Handler gesammelt durch Joinen von:
 * - Qualifikation Aggregate (id, name, abkuerzung)
 * - StammPersonQualifikation Junction Table (createdAt, createdBy) - optional
 *
 * **Verwendung:**
 * - Query Handlers: Laden Qualifikation Aggregates und optional Junction Table Audit
 * - Command Handlers: Laden nur Qualifikation Aggregates (ohne Audit)
 */
export interface QualifikationData {
  id: string;
  name: string;
  kuerzel: string;
  zugewiesenAm?: Date;
  zugewiesenVon?: string;
}

/**
 * Mapper von StammPerson Aggregate zu StammPersonDto.
 *
 * Wird in Query Handlers und Command Handlers verwendet um Domain Aggregates zu Response DTOs zu mappen.
 *
 * **Qualifikationen-Relation:**
 * - StammPerson Aggregate enthält qualifikationIds: string[]
 * - Handler laden zugehörige Qualifikation-Aggregates
 * - Optional: Query Handler lädt Audit-Trail aus Junction Table (zugewiesenAm/zugewiesenVon)
 * - Mapper kombiniert beide Datenquellen zu StammPersonQualifikationDto[]
 *
 * **WICHTIG:** Response DTO enthält vollständige Qualifikations-Info:
 * - Qualifikations-Basis-Daten (id, name, kuerzel)
 * - Optional: Audit-Trail der Zuweisung (zugewiesenAm, zugewiesenVon)
 *
 * **Überladungen:**
 * - toDto(aggregate, Qualifikation[]): Für Command Handlers (ohne Audit)
 * - toDto(aggregate, QualifikationData[]): Für Query Handlers (mit optional Audit)
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query Mapping
 */
export class StammPersonQueryMapper {
  /**
   * Mappt ein StammPerson Aggregate zu einem StammPersonDto.
   *
   * **Überladung 1:** Akzeptiert Qualifikation Aggregates (verwendet von Command Handlers).
   */
  static toDto(aggregate: StammPerson, qualifikationen: Qualifikation[]): StammPersonDto;

  /**
   * Mappt ein StammPerson Aggregate zu einem StammPersonDto.
   *
   * **Überladung 2:** Akzeptiert QualifikationData mit optional Audit-Trail (verwendet von Query Handlers).
   */
  static toDto(aggregate: StammPerson, qualifikationen: QualifikationData[]): StammPersonDto;

  /**
   * Mappt ein StammPerson Aggregate zu einem StammPersonDto.
   *
   * Konvertiert Domain Value Objects zu primitiven Typen für API-Response.
   * Kombiniert Qualifikation-Daten mit optionalem Junction Table Audit-Trail.
   *
   * **Parameter:**
   * @param aggregate - StammPerson Aggregate
   * @param qualifikationen - Array von Qualifikations-Daten oder Qualifikation Aggregates
   *
   * **Returns:**
   * @returns StammPersonDto mit allen Feldern inkl. qualifikationen Array
   */
  static toDto(aggregate: StammPerson, qualifikationen: Qualifikation[] | QualifikationData[]): StammPersonDto {
    // Mappe Qualifikationen zu StammPersonQualifikationDto
    const qualifikationDtos: StammPersonQualifikationDto[] = qualifikationen.map((qual) => {
      // Handle both Qualifikation Aggregate and QualifikationData
      if ('id' in qual && typeof qual.id === 'object' && 'value' in qual.id) {
        // Qualifikation Aggregate (has id.value getter)
        const qualAggregate = qual as Qualifikation;
        return {
          id: qualAggregate.id.value,
          name: qualAggregate.name,
          kuerzel: qualAggregate.abkuerzung,
          // Audit-Trail not available from Aggregate
          zugewiesenAm: undefined,
          zugewiesenVon: undefined,
        };
      }
      // QualifikationData (plain object with optional audit)
      const qualData = qual as QualifikationData;
      return {
        id: qualData.id,
        name: qualData.name,
        kuerzel: qualData.kuerzel,
        zugewiesenAm: qualData.zugewiesenAm,
        zugewiesenVon: qualData.zugewiesenVon,
      };
    });

    return {
      id: aggregate.id.value,
      vorname: aggregate.vorname,
      nachname: aggregate.nachname,
      personalnummer: aggregate.personalnummer,
      funkkenungBOS: aggregate.funkkenungBOS,
      qualifikationen: qualifikationDtos,
      archivedAt: aggregate.archivedAt,
      archivedBy: aggregate.archivedBy,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
    };
  }

  /**
   * Mappt ein Array von StammPerson Aggregates zu StammPersonDtos.
   *
   * **Hinweis:**
   * Diese Methode erwartet, dass für jede StammPerson bereits die Qualifikation-Daten
   * geladen wurden (joined mit Junction Table). Der Repository/Handler ist verantwortlich
   * für das Eager Loading.
   *
   * **Parameter:**
   * @param aggregates - Array von StammPerson Aggregates mit zugehörigen Qualifikationen
   *
   * **Returns:**
   * @returns Array von StammPersonDtos
   */
  static toDtoList(aggregates: Array<{ aggregate: StammPerson; qualifikationen: QualifikationData[] }>): StammPersonDto[] {
    return aggregates.map(({ aggregate, qualifikationen }) => StammPersonQueryMapper.toDto(aggregate, qualifikationen));
  }
}
