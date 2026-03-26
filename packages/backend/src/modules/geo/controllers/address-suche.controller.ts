/**
 * Adresssuche Controller.
 *
 * Stellt einen Endpoint für Adress-Autocomplete bereit.
 * Nutzt Photon (Komoot) als externe Datenquelle (via Adapter).
 *
 * **Route:** GET /geo/address/search?q=...&lat=...&lon=...&lang=de&limit=5&countryCode=de
 *
 * @module modules/geo/controllers
 */

import { Controller, Get, BadRequestException, ServiceUnavailableException, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { AddressSucheHandler } from '@/application/geo/queries/address-suche.handler';

/** Rate Limit für Adresssuche: 10 Requests pro Minute */
const ADDRESS_SEARCH_RATE_LIMIT = {
  limit: 10,
  ttl: 60000,
} as const;

/**
 * Response DTO für ein einzelnes Adress-Suchergebnis.
 */
class AddressSucheErgebnisDto {
  @ApiProperty({ description: 'Straßenname', example: 'Marienplatz' })
  strasse!: string;

  @ApiPropertyOptional({ description: 'Hausnummer', example: '1a' })
  hausnummer?: string;

  @ApiProperty({ description: 'Ortsname', example: 'München' })
  ort!: string;

  @ApiPropertyOptional({ description: 'Postleitzahl', example: '80331' })
  plz?: string;

  @ApiPropertyOptional({ description: 'Bundesland oder Region', example: 'Bayern' })
  bundesland?: string;

  @ApiProperty({ description: 'Land', example: 'Germany' })
  land!: string;

  @ApiProperty({ description: 'Längengrad', example: '11.5761' })
  laengengrad!: string;

  @ApiProperty({ description: 'Breitengrad', example: '48.1372' })
  breitengrad!: string;
}

@ApiTags('Geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiTooManyRequestsResponse({ description: 'Rate Limit überschritten' })
@Controller('geo')
export class AddressSucheController {
  constructor(private readonly addressSucheHandler: AddressSucheHandler) {}

  @Get('address/search')
  @Throttle({ default: ADDRESS_SEARCH_RATE_LIMIT })
  @ApiOperation({
    summary: 'Adresssuche',
    description: 'Sucht Adressen per Autocomplete via Photon (OpenStreetMap). Unterstützt optionalen Koordinaten-Bias und Ländercode-Filter.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Suchbegriff (2-100 Zeichen)', example: 'Marienplatz München' })
  @ApiQuery({ name: 'lat', required: false, description: 'Breitengrad für Ergebnis-Bias', example: '48.1372' })
  @ApiQuery({ name: 'lon', required: false, description: 'Längengrad für Ergebnis-Bias', example: '11.5761' })
  @ApiQuery({ name: 'lang', required: false, description: 'Sprache der Ergebnisse', example: 'de' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximale Anzahl Ergebnisse (1-10)', example: 5 })
  @ApiQuery({ name: 'countryCode', required: false, description: 'ISO-3166-1 Alpha-2 Ländercode-Filter', example: 'de' })
  @ApiWrappedResponse(AddressSucheErgebnisDto, { description: 'Adress-Suchergebnisse', isArray: true })
  @ApiBadRequestResponse({ description: 'Ungültiger Suchbegriff' })
  @ApiServiceUnavailableResponse({ description: 'Externe API nicht erreichbar' })
  async search(
    @Query('q') q: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('lang') lang?: string,
    @Query('limit') limitStr?: string,
    @Query('countryCode') countryCode?: string,
  ): Promise<AddressSucheErgebnisDto[]> {
    const parsed = limitStr ? Number.parseInt(limitStr, 10) : undefined;
    const limit = parsed != null && !Number.isNaN(parsed) ? Math.min(Math.max(parsed, 1), 10) : limitStr ? 5 : undefined;

    const result = await this.addressSucheHandler.execute(q, {
      lat,
      lon,
      lang,
      limit,
      countryCode,
    });

    if (result.isFailure) {
      const error = result.error!;

      if (GeoError.hasCode(error, GEO_ERROR_CODES.INVALID_INPUT)) {
        throw new BadRequestException(GeoError.extractMessage(error));
      }

      if (GeoError.hasCode(error, GEO_ERROR_CODES.SERVICE_UNAVAILABLE)) {
        throw new ServiceUnavailableException(GeoError.extractMessage(error));
      }

      throw new ServiceUnavailableException(error);
    }

    return result.value!;
  }
}
