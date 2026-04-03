import type { EinsatzEinheit } from '@domain/kraefte/aggregates/einsatz-einheit.aggregate';
import type { EinsatzEinheitDto } from './dto';

/**
 * Mappt ein EinsatzEinheit Aggregate zu einem EinsatzEinheitDto.
 *
 * Wird von Command und Query Handlers verwendet um konsistentes
 * DTO-Mapping sicherzustellen.
 *
 * @param einheit - Das EinsatzEinheit Aggregate
 * @returns EinsatzEinheitDto mit allen relevanten Feldern
 */
export function mapEinheitToDto(einheit: EinsatzEinheit): EinsatzEinheitDto {
  return {
    id: einheit.id.value,
    einsatzId: einheit.einsatzId,
    parentId: einheit.parentId ?? null,
    name: einheit.name,
    typ: einheit.typ,
    funktion: einheit.funktion ?? null,
    status: einheit.status,
    einheitenfuehrerId: einheit.einheitenfuehrerId ?? null,
    einheitenfuehrerName: null, // Wird vom Handler nachgeladen
    sollStaerke: einheit.sollStaerke,
    istStaerke: einheit.istStaerke ?? 0,
    auftrag: einheit.auftrag ?? null,
    einsatzort: einheit.einsatzort ?? null,
    createdAt: einheit.createdAt.toISOString(),
    updatedAt: einheit.updatedAt.toISOString(),
  } as EinsatzEinheitDto;
}
