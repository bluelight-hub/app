/**
 * PLZ-Lookup Controller.
 *
 * Stellt einen Endpoint für Postleitzahlen-Lookup bereit.
 * Nutzt zippopotam.us als externe Datenquelle (via Adapter).
 *
 * **Route:** GET /geo/plz/:countryCode/:plz
 *
 * @module modules/geo/controllers
 */

import { Controller, Get, NotFoundException, BadRequestException, ServiceUnavailableException, Param, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { GEOCODING_RATE_LIMIT } from '@infrastructure/http/constants/rate-limit.constants';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { PlzLookupHandler } from '@/application/geo/queries/plz-lookup.handler';

/**
 * Response DTO für einen einzelnen Ort.
 */
class PlzOrtDto {
  @ApiProperty({ description: 'Name des Ortes', example: 'München' })
  ortsname!: string;

  @ApiProperty({ description: 'Bundesland oder Region', example: 'Bayern' })
  bundesland!: string;

  @ApiProperty({ description: 'Kürzel des Bundeslandes', example: 'BY' })
  bundeslandKuerzel!: string;

  @ApiProperty({ description: 'Längengrad', example: '11.571' })
  laengengrad!: string;

  @ApiProperty({ description: 'Breitengrad', example: '48.1345' })
  breitengrad!: string;
}

/**
 * Response DTO für PLZ-Lookup.
 */
class PlzLookupResponseDto {
  @ApiProperty({ description: 'Abgefragte Postleitzahl', example: '80331' })
  postleitzahl!: string;

  @ApiProperty({ description: 'Land', example: 'Germany' })
  land!: string;

  @ApiProperty({ description: 'ISO-3166-1 Alpha-2 Ländercode', example: 'DE' })
  landKuerzel!: string;

  @ApiProperty({ description: 'Zugehörige Orte', type: [PlzOrtDto] })
  orte!: PlzOrtDto[];
}

@ApiTags('Geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiTooManyRequestsResponse({ description: 'Rate Limit überschritten' })
@Controller('geo')
export class PlzLookupController {
  constructor(private readonly plzLookupHandler: PlzLookupHandler) {}

  @Get('plz/:countryCode/:plz')
  @Throttle({ default: GEOCODING_RATE_LIMIT })
  @ApiOperation({
    summary: 'PLZ-Lookup',
    description: 'Sucht Ortsinformationen zu einer Postleitzahl. Unterstützt DACH und nahe EU-Länder.',
  })
  @ApiParam({ name: 'countryCode', description: 'ISO-3166-1 Alpha-2 Ländercode', example: 'DE' })
  @ApiParam({ name: 'plz', description: 'Postleitzahl', example: '80331' })
  @ApiWrappedResponse(PlzLookupResponseDto, { description: 'PLZ-Lookup Ergebnis' })
  @ApiNotFoundResponse({ description: 'PLZ nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültiger Ländercode oder PLZ-Format' })
  @ApiServiceUnavailableResponse({ description: 'Externe API nicht erreichbar' })
  async lookup(@Param('countryCode') countryCode: string, @Param('plz') plz: string): Promise<PlzLookupResponseDto> {
    const result = await this.plzLookupHandler.execute(countryCode, plz);

    if (result.isFailure) {
      const error = result.error!;

      if (GeoError.hasCode(error, GEO_ERROR_CODES.PLZ_NOT_FOUND)) {
        throw new NotFoundException(GeoError.extractMessage(error));
      }

      if (GeoError.hasCode(error, GEO_ERROR_CODES.COUNTRY_NOT_SUPPORTED)) {
        throw new BadRequestException(GeoError.extractMessage(error));
      }

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
