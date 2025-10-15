import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePoiDto } from './create-poi.dto';

/**
 * DTO für POI-Aktualisierung
 *
 * Alle Felder von CreatePoiDto sind optional, außer `lagekarteId` (wird ausgeschlossen).
 *
 * **Geocoding bei Update:**
 * - Wenn `adresse` geändert wird, erfolgt automatisches Re-Geocoding
 * - Wenn Geocoding fehlschlägt, bleiben alte Koordinaten erhalten
 * - Manuelle Koordinaten überschreiben Geocoding-Ergebnisse
 */
export class UpdatePoiDto extends PartialType(OmitType(CreatePoiDto, ['lagekarteId'] as const)) {}
