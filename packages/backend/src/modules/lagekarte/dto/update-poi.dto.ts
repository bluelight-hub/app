import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePoiDto } from './create-poi.dto';

/**
 * DTO für POI-Aktualisierung
 *
 * Alle Felder von CreatePoiDto sind optional, außer `lagekarteId` (wird ausgeschlossen).
 *
 * **MGRS-Support:**
 * - `mgrs` ist über CreatePoiDto verfügbar (via PartialType)
 * - MGRS hat Priorität über Lat/Lng bei Updates
 * - Wenn `mgrs` gesetzt wird, werden Lat/Lng automatisch neu berechnet
 *
 * **Geocoding bei Update:**
 * - Wenn `adresse` geändert wird, erfolgt automatisches Re-Geocoding
 * - Wenn Geocoding fehlschlägt, bleiben alte Koordinaten erhalten
 * - Manuelle Koordinaten überschreiben Geocoding-Ergebnisse
 * - MGRS-Koordinaten haben Vorrang vor allen anderen Formaten
 */
export class UpdatePoiDto extends PartialType(OmitType(CreatePoiDto, ['lagekarteId'] as const)) {}
