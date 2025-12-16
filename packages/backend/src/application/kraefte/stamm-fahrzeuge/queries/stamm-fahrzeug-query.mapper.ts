import type { StammFahrzeug } from '@domain/kraefte/aggregates/stamm-fahrzeug.aggregate';
import type { Fahrzeugtyp } from '@domain/kraefte';
import { FahrzeugtypQueryMapper } from '../../fahrzeugtypen/queries/fahrzeugtyp-query.mapper';
import type { StammFahrzeugDto } from '../dto';

/**
 * Mapper von StammFahrzeug Aggregate zu StammFahrzeugDto.
 *
 * Wird in Query Handlers verwendet um Domain Aggregates zu Response DTOs zu mappen.
 *
 * **Fahrzeugtyp-Relation:**
 * - StammFahrzeug Aggregate enthält fahrzeugtyp: Fahrzeugtyp Aggregate (joined)
 * - Mapper nutzt FahrzeugtypQueryMapper für nested mapping
 * - Vermeidet Code-Duplikation und hält Mapper-Logik zentral
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Query Mapping
 */
export class StammFahrzeugQueryMapper {
  /**
   * Mappt ein StammFahrzeug Aggregate zu einem StammFahrzeugDto.
   *
   * Konvertiert Domain Value Objects zu primitiven Typen für API-Response.
   * Mappt nested Fahrzeugtyp Aggregate via FahrzeugtypQueryMapper.
   *
   * **Parameter:**
   * @param aggregate - StammFahrzeug Aggregate mit joined Fahrzeugtyp
   * @param fahrzeugtyp - Fahrzeugtyp Aggregate (joined relation)
   *
   * **Returns:**
   * @returns StammFahrzeugDto mit allen Feldern inkl. fahrzeugtyp
   */
  static toDto(aggregate: StammFahrzeug, fahrzeugtyp: Fahrzeugtyp): StammFahrzeugDto {
    return {
      id: aggregate.id.value,
      rufname: aggregate.rufname,
      funkrufname: aggregate.funkrufname,
      fahrzeugtypId: aggregate.fahrzeugtypId, // fahrzeugtypId ist bereits ein String
      fahrzeugtyp: FahrzeugtypQueryMapper.toDto(fahrzeugtyp), // Nested mapping
      kennzeichen: aggregate.kennzeichen,
      baujahr: aggregate.baujahr,
      funkkenungBOS: aggregate.funkkenungBOS,
      archivedAt: aggregate.archivedAt,
      archivedBy: aggregate.archivedBy,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
    };
  }

  /**
   * Mappt ein Array von StammFahrzeug Aggregates zu StammFahrzeugDtos.
   *
   * **Hinweis:**
   * Diese Methode erwartet, dass StammFahrzeug bereits den Fahrzeugtyp als Property hat.
   * Der Repository sollte die Relation bereits joinen (Prisma `include: { fahrzeugtyp: true }`).
   *
   * **Parameter:**
   * @param aggregates - Array von StammFahrzeug Aggregates mit joined Fahrzeugtyp
   *
   * **Returns:**
   * @returns Array von StammFahrzeugDtos
   */
  static toDtoList(aggregates: Array<{ aggregate: StammFahrzeug; fahrzeugtyp: Fahrzeugtyp }>): StammFahrzeugDto[] {
    return aggregates.map(({ aggregate, fahrzeugtyp }) => StammFahrzeugQueryMapper.toDto(aggregate, fahrzeugtyp));
  }
}
