import type { HazardZone } from '@domain/hazard-zone/entities/hazard-zone.entity';
import { Warnstufe, WARNSTUFE_ORDER } from '@domain/gefahr/value-objects/warnstufe';
import type { Gefahrentyp } from '@domain/gefahr/value-objects/gefahrentyp';
import type { HazardZoneDto } from '../dto/hazard-zone-response.dto';

/**
 * Ermittelt die höchste Warnstufe über alle Schutzobjekte eines bestimmten
 * Gefahrentyps für einen Einsatz (Issue #627, AC3).
 *
 * - Ignoriert Bewertungen mit Warnstufe KEINE (entspricht "keine Bewertung").
 * - Default bei fehlenden Bewertungen: `Warnstufe.KEINE`.
 */
export function computeMaxWarnstufe(bewertungen: ReadonlyArray<{ gefahrentyp: Gefahrentyp | string; warnstufe: Warnstufe | string }>, gefahrentyp: Gefahrentyp | string): Warnstufe {
  const relevant = bewertungen.filter((b) => b.gefahrentyp === gefahrentyp && b.warnstufe !== Warnstufe.KEINE);
  if (relevant.length === 0) {
    return Warnstufe.KEINE;
  }
  let maxIndex = 0;
  for (const b of relevant) {
    const idx = WARNSTUFE_ORDER.indexOf(b.warnstufe as Warnstufe);
    if (idx > maxIndex) {
      maxIndex = idx;
    }
  }
  return WARNSTUFE_ORDER[maxIndex] ?? Warnstufe.KEINE;
}

/**
 * Mappt eine HazardZone auf ihr Response-DTO.
 */
export function mapZoneToDto(zone: HazardZone, maxWarnstufe: Warnstufe): HazardZoneDto {
  return {
    id: zone.id.value,
    einsatzId: zone.einsatzId,
    gefahrentyp: zone.gefahrentyp,
    geometryType: zone.geometryType,
    geometry: zone.geometry as unknown as Record<string, unknown>,
    radiusMeters: zone.radiusMeters,
    label: zone.label,
    beschreibung: zone.beschreibung,
    maxWarnstufe,
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
    createdBy: zone.createdBy,
    updatedBy: zone.updatedBy,
  };
}
