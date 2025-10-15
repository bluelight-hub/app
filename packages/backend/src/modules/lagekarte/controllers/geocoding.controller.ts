import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator';
import { Body, Controller, Logger, Param, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiProperty, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { GeocodingService } from '../services/geocoding.service';

/**
 * DTO für Geocoding-Request
 */
class GeocodeAddressDto {
  @ApiProperty({
    description: 'Adresse die geocoded werden soll',
    example: 'Hauptstraße 1, 10115 Berlin',
  })
  @IsString()
  address!: string;
}

/**
 * Controller für Geocoding-Funktionalität
 *
 * **Verwendung:**
 * - Frontend kann Adressen geocoden BEVOR POI erstellt wird
 * - Rate-Limited auf 1 Request/Sekunde (Nominatim Policy)
 *
 * **Route Structure:**
 * - Base: `/einsatz/:einsatzId`
 * - Geocoding: `POST /geocode`
 *
 * @security Alle Endpunkte erfordern valides JWT Token
 */
@ApiTags('Geocoding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({
  path: 'einsatz/:einsatzId',
  version: 'alpha',
})
export class GeocodingController {
  private readonly logger = new Logger(GeocodingController.name);

  constructor(private readonly geocodingService: GeocodingService) {}

  /**
   * Geocode eine Adresse zu Koordinaten
   *
   * **Rate-Limiting:**
   * - Max. 1 Request/Sekunde (Nominatim Policy)
   * - Bei Überschreitung: 429 Too Many Requests
   *
   * **Fallback:**
   * - Wenn Geocoding fehlschlägt: Gibt `null` zurück
   * - Frontend muss dann manuelle Koordinaten-Eingabe anbieten
   *
   * @param einsatzId - ID des Einsatzes (für Kontext/Logging)
   * @param dto - GeocodeAddressDto mit Adresse
   * @returns Koordinaten {lat, lon} oder null bei Fehler
   */
  @Post('geocode')
  @ApiOperation({
    summary: 'Geocode address to coordinates',
    description: 'Konvertiert eine Adresse in geografische Koordinaten via Nominatim API. Rate-Limited auf 1 Request/Sekunde. Gibt null zurück bei Fehler.',
  })
  @ApiWrappedResponse(Object, {
    description: 'Geocoding erfolgreich oder null bei Fehler',
  })
  @ApiBadRequestResponse({ description: 'Ungültige Adresse' })
  async geocodeAddress(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: GeocodeAddressDto,
  ): Promise<{ lat: number; lon: number } | null> {
    this.logger.log(`Geocoding address for Einsatz ${einsatzId}: "${dto.address}"`);

    const result = await this.geocodingService.geocodeAddress(dto.address);

    if (result) {
      this.logger.log(`Geocoding successful: ${dto.address} → (${result.lat}, ${result.lon})`);
    } else {
      this.logger.warn(`Geocoding failed for address: ${dto.address}`);
    }

    return result;
  }
}
