import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@/generated/prisma/client';

/**
 * DTO für POI-Response
 *
 * **Verwendung:**
 * - Wird für alle API-Responses zurückgegeben, die POI-Daten enthalten
 * - Spiegelt die vollständige POI-Struktur aus der Datenbank
 *
 * **Koordinaten-Format:**
 * - `mgrs`: Primäres Koordinatenformat (MGRS) - wenn verfügbar
 * - `latitude`/`longitude`: Fallback für Systeme ohne MGRS-Support
 * - MGRS hat Vorrang bei der Anzeige
 *
 * **Felder:**
 * - `id`: Eindeutige CUID des POI
 * - `lagekarteId`: Referenz zur zugehörigen Lagekarte
 * - `type`: POI-Typ (z.B. EINSATZORT, FAHRZEUG)
 * - `name`: Optional - Anzeigename des POI
 * - `mgrs`: Optional - MGRS-Koordinaten (primär)
 * - `adresse`: Optional - Adresse für Geocoding
 * - `latitude`: Geografische Breite (Fallback)
 * - `longitude`: Geografische Länge (Fallback)
 * - `icon`: Optional - Icon-Identifier
 * - `metadata`: Optional - Zusätzliche Metadaten als JSON
 * - `createdAt`: Erstellungszeitpunkt
 * - `updatedAt`: Letzte Aktualisierung
 */
export class PoiResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID des POI (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'ID der zugehörigen Lagekarte',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  lagekarteId!: string;

  @ApiProperty({
    enum: PoiType,
    description: 'Typ des POI (z.B. EINSATZORT, FAHRZEUG, GEFAHRENQUELLE)',
    example: 'EINSATZORT',
  })
  type!: PoiType;

  @ApiPropertyOptional({
    type: String,
    description: 'Name/Bezeichnung des POI',
    example: 'Haupteinsatzstelle',
    nullable: true,
  })
  name?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'MGRS Koordinaten (primäres Format)',
    example: '33UVU1234567890',
    nullable: true,
  })
  mgrs?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Adresse des POI',
    example: 'Hauptstraße 1, 10115 Berlin',
    nullable: true,
  })
  adresse?: string | null;

  @ApiProperty({
    description: 'Geografische Breite',
    example: 52.52,
    minimum: -90,
    maximum: 90,
  })
  latitude!: number;

  @ApiProperty({
    description: 'Geografische Länge',
    example: 13.405,
    minimum: -180,
    maximum: 180,
  })
  longitude!: number;

  @ApiPropertyOptional({
    type: String,
    description: 'Icon-Identifier für Kartendarstellung',
    example: 'fire-station',
    nullable: true,
  })
  icon?: string | null;

  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten als JSON',
    example: { color: 'red', size: 'large' },
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Zeitpunkt der Erstellung',
    example: '2024-01-15T12:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Zeitpunkt der letzten Aktualisierung',
    example: '2024-01-15T14:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt!: Date;
}
