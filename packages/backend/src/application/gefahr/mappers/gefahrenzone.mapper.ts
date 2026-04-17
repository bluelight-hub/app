import type { Gefahrenzone } from '@domain/gefahr/entities/gefahrenzone.entity';
import type { Warnstufe } from '@domain/gefahr/value-objects/warnstufe';
import type { GefahrenzoneDto } from '../dto/gefahrenzone-response.dto';

/**
 * Wandelt ein Gefahrenzone-Aggregate + die abgeleitete Matrix-Warnstufe in das API-DTO.
 *
 * Die `warnstufe` wird aus dem Matrix-Join gezogen (oder ist `null`, wenn die Zelle
 * noch unbewertet ist). Im Frontend kann sie alternativ aus der Matrix-Query gejoint
 * werden — wir liefern sie trotzdem denormalisiert aus, damit der initiale Map-Render
 * keinen zusätzlichen Matrix-Fetch braucht.
 */
export function toGefahrenzoneDto(zone: Gefahrenzone, warnstufe: Warnstufe | null): GefahrenzoneDto {
  return {
    id: zone.id.value,
    einsatzId: zone.einsatzId,
    gefahrentyp: zone.gefahrentyp,
    schutzobjekt: zone.schutzobjekt,
    geometryType: zone.geometryType,
    geometry: zone.geometry.toJSON() as unknown as Record<string, unknown>,
    bezeichnung: zone.bezeichnung,
    warnstufe,
    erstelltVon: zone.erstelltVon,
    aktualisiertVon: zone.aktualisiertVon,
    erstelltAm: zone.createdAt,
    aktualisiertAm: zone.updatedAt,
  };
}
