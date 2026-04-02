import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import type { Fahrzeugtyp, EinsatzPerson } from '@domain/kraefte';
import { FahrzeugtypQueryMapper } from '../../fahrzeugtypen/queries/fahrzeugtyp-query.mapper';
import type { EinsatzFahrzeugDto, EinsatzFahrzeugListItemDto, BesatzungMemberDto } from '../dto';

/**
 * Mapper von EinsatzFahrzeug Aggregate zu EinsatzFahrzeugDto.
 *
 * Wird in Query Handlers und Command Handlers verwendet um Domain Aggregates
 * zu Response DTOs zu mappen.
 *
 * **Fahrzeugtyp-Relation:**
 * - EinsatzFahrzeug enthält fahrzeugtypId (String)
 * - Repository lädt Fahrzeugtyp Aggregate für nested mapping
 * - Vermeidet N+1 Queries durch eager loading im Repository
 *
 * **Story Context:**
 * Story 3-1 (Fahrzeug aus Stammdaten erfassen) - Application Layer Query Mapping
 */
export class EinsatzFahrzeugQueryMapper {
  /**
   * Mappt ein EinsatzFahrzeug Aggregate zu einem EinsatzFahrzeugDto.
   *
   * Konvertiert Domain Value Objects zu primitiven Typen für API-Response.
   * Mappt nested Fahrzeugtyp Aggregate via FahrzeugtypQueryMapper.
   * Mappt zugewiesene Besatzung zu BesatzungMemberDto (Story 4.3 AC5).
   *
   * @param aggregate - EinsatzFahrzeug Aggregate
   * @param fahrzeugtyp - Fahrzeugtyp Aggregate (joined relation)
   * @param besatzung - Zugewiesene EinsatzPersonen (optional)
   * @returns EinsatzFahrzeugDto mit allen Feldern inkl. fahrzeugtyp und besatzung
   */
  static toDto(aggregate: EinsatzFahrzeug, fahrzeugtyp: Fahrzeugtyp, besatzung: EinsatzPerson[] = []): EinsatzFahrzeugDto {
    return {
      id: aggregate.id.value,
      einsatzId: aggregate.einsatzId,
      stammId: aggregate.stammId,
      fahrzeugtypId: aggregate.fahrzeugtypId,
      funkrufname: aggregate.funkrufname,
      kennzeichen: aggregate.kennzeichen,
      fmsStatus: aggregate.fmsStatus,
      position: aggregate.position?.toJSON(),
      createdAt: aggregate.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: aggregate.updatedAt?.toISOString() ?? new Date().toISOString(),
      createdBy: aggregate.createdBy,
      updatedBy: aggregate.updatedBy,
      einheitId: aggregate.einheitId,
      fahrzeugtyp: FahrzeugtypQueryMapper.toDto(fahrzeugtyp),
      besatzung:
        besatzung.length > 0
          ? besatzung.map(
              (person): BesatzungMemberDto => ({
                id: person.id.value,
                vorname: person.vorname,
                nachname: person.nachname,
              }),
            )
          : undefined,
    };
  }

  /**
   * Mappt ein EinsatzFahrzeug zu einem vereinfachten List-Item DTO.
   *
   * Für Übersichtstabellen mit reduzierten Feldern.
   *
   * @param aggregate - EinsatzFahrzeug Aggregate
   * @param fahrzeugtypBezeichnung - Fahrzeugtyp Bezeichnung (String)
   * @returns EinsatzFahrzeugListItemDto
   */
  static toListItemDto(aggregate: EinsatzFahrzeug, fahrzeugtypBezeichnung: string): EinsatzFahrzeugListItemDto {
    return {
      id: aggregate.id.value,
      funkrufname: aggregate.funkrufname,
      kennzeichen: aggregate.kennzeichen,
      fmsStatus: aggregate.fmsStatus,
      fahrzeugtypBezeichnung,
    };
  }

  /**
   * Mappt ein Array von EinsatzFahrzeug Aggregates zu DTOs.
   *
   * @param aggregates - Array von EinsatzFahrzeug mit Fahrzeugtyp und optional Besatzung
   * @returns Array von EinsatzFahrzeugDtos
   */
  static toDtoList(aggregates: Array<{ aggregate: EinsatzFahrzeug; fahrzeugtyp: Fahrzeugtyp; besatzung?: EinsatzPerson[] }>): EinsatzFahrzeugDto[] {
    return aggregates.map(({ aggregate, fahrzeugtyp, besatzung }) => EinsatzFahrzeugQueryMapper.toDto(aggregate, fahrzeugtyp, besatzung));
  }
}
