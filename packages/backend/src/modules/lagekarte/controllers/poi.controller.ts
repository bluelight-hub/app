import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator';
import { Body, Controller, Delete, Get, Logger, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiExtraModels, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PoiService } from '../services/poi.service';
import { LagekarteService } from '../services/lagekarte.service';
import { CreatePoiDto } from '../dto/create-poi.dto';
import { UpdatePoiDto } from '../dto/update-poi.dto';
import { PoiResponseDto } from '../dto/poi-response.dto';
import { LagekartePoi } from '@prisma/client';

/**
 * Controller für POI-Management (Points of Interest)
 *
 * **POI-Typen:**
 * - EINSATZORT, EINSATZABSCHNITT, EINSATZLEITUNG
 * - FAHRZEUG, EINHEIT
 * - GEFAHRENQUELLE, SPERRBEREICH, VERSORGUNGSPUNKT
 * - BEREITSTELLUNGSRAUM, BEHANDLUNGSPLATZ, SAMMELSTELLE
 * - UNTERKUNFT, SONSTIGES
 *
 * **Route Structure:**
 * - Base: `/einsatz/:einsatzId/lagekarte/pois`
 * - Alle Routes sind JWT-geschützt via `JwtAuthGuard`
 *
 * @security Alle Endpunkte erfordern valides JWT Token
 */
@ApiTags('POI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@ApiExtraModels(PoiResponseDto)
@Controller({
  path: 'einsatz/:einsatzId/lagekarte/pois',
  version: 'alpha',
})
export class PoiController {
  private readonly logger = new Logger(PoiController.name);

  constructor(
    private readonly poiService: PoiService,
    private readonly lagekarteService: LagekarteService,
  ) {}

  /**
   * Alle POIs einer Lagekarte abrufen
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Array aller POIs der Lagekarte
   */
  @Get()
  @ApiOperation({
    summary: 'POIs abrufen',
    description: 'Gibt alle POIs einer Lagekarte zurück. POIs werden nach Typ gruppiert zurückgegeben. Lazy Creation: Wenn keine Lagekarte existiert, wird sie automatisch erstellt.',
  })
  @ApiWrappedResponse(PoiResponseDto, { description: 'POIs erfolgreich abgerufen', isArray: true })
  @ApiNotFoundResponse({ description: 'Einsatz nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async getPois(@Param('einsatzId') einsatzId: string): Promise<LagekartePoi[]> {
    this.logger.log(`Getting POIs for Einsatz ${einsatzId}`);

    // Lazy creation: Get or create lagekarte (consistent with LagekarteController)
    const lagekarte = await this.lagekarteService.getOrCreateLagekarte(einsatzId);

    const pois = await this.poiService.getPoisByLagekarteId(lagekarte.id);
    this.logger.log(`Returning ${pois.length} POIs for Einsatz ${einsatzId}`);
    return pois;
  }

  /**
   * POI erstellen
   *
   * **Geocoding:**
   * - Wenn `adresse` angegeben: Nominatim API wird aufgerufen
   * - Wenn Geocoding fehlschlägt: Fallback zu manuellen Koordinaten
   *
   * @param dto - CreatePoiDto mit POI-Daten
   * @param user - Authentifizierter User
   * @returns Erstellter POI
   */
  @Post()
  @ApiOperation({
    summary: 'POI erstellen',
    description: 'Erstellt einen neuen POI. Wenn eine Adresse angegeben ist, wird sie automatisch geocoded. Bei Geocoding-Fehlern müssen manuelle Koordinaten angegeben werden.',
  })
  @ApiWrappedResponse(PoiResponseDto, { description: 'POI erfolgreich erstellt' })
  @ApiNotFoundResponse({ description: 'Lagekarte nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async createPoi(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreatePoiDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<LagekartePoi> {
    this.logger.log(`Creating POI (type: ${dto.type}) by user ${user.userId}`);

    const poi = await this.poiService.createPoi(dto);
    this.logger.log(`POI ${poi.id} created (type: ${poi.type})`);
    return poi;
  }

  /**
   * Einzelnen POI abrufen
   *
   * @param poiId - ID des POI
   * @returns POI-Daten
   */
  @Get(':poiId')
  @ApiOperation({
    summary: 'POI abrufen',
    description: 'Gibt einen einzelnen POI mit allen Details zurück.',
  })
  @ApiWrappedResponse(PoiResponseDto, { description: 'POI gefunden' })
  @ApiNotFoundResponse({ description: 'POI nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige POI-ID' })
  async getPoi(@Param('poiId') poiId: string): Promise<LagekartePoi> {
    this.logger.log(`Getting POI ${poiId}`);
    const poi = await this.poiService.getPoiById(poiId);
    this.logger.log(`POI ${poiId} found (type: ${poi.type})`);
    return poi;
  }

  /**
   * POI aktualisieren
   *
   * **Geocoding Update:**
   * - Wenn neue `adresse` angegeben: Re-Geocoding wird durchgeführt
   * - Wenn Geocoding fehlschlägt: Alte Koordinaten bleiben erhalten
   *
   * @param poiId - ID des POI
   * @param dto - UpdatePoiDto mit zu ändernden Feldern
   * @param user - Authentifizierter User
   * @returns Aktualisierter POI
   */
  @Put(':poiId')
  @ApiOperation({
    summary: 'POI aktualisieren',
    description: 'Aktualisiert einen bestehenden POI. Wenn die Adresse geändert wird, wird automatisch ein Re-Geocoding durchgeführt.',
  })
  @ApiWrappedResponse(PoiResponseDto, { description: 'POI erfolgreich aktualisiert' })
  @ApiNotFoundResponse({ description: 'POI nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async updatePoi(
    @Param('poiId') poiId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdatePoiDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<LagekartePoi> {
    this.logger.log(`Updating POI ${poiId} by user ${user.userId}`);

    const updatedPoi = await this.poiService.updatePoi(poiId, dto);
    this.logger.log(`POI ${poiId} updated (type: ${updatedPoi.type})`);
    return updatedPoi;
  }

  /**
   * POI löschen
   *
   * @param poiId - ID des POI
   * @param user - Authentifizierter User
   */
  @Delete(':poiId')
  @ApiOperation({
    summary: 'POI löschen',
    description: 'Löscht einen POI permanent. Diese Aktion kann nicht rückgängig gemacht werden.',
  })
  @ApiWrappedResponse(PoiResponseDto, { description: 'POI erfolgreich gelöscht' })
  @ApiNotFoundResponse({ description: 'POI nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige POI-ID' })
  async deletePoi(@Param('poiId') poiId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    this.logger.warn(`Deleting POI ${poiId} by user ${user.userId}`);

    await this.poiService.deletePoi(poiId);
    this.logger.warn(`POI ${poiId} deleted`);
  }
}
