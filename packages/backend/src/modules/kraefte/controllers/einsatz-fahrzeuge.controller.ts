import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { ErfasseFahrzeugAusStammdatenHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.handler';
import { ErfasseTemporalesFahrzeugHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler';
import { UpdateFmsStatusHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/update-fms-status/update-fms-status.handler';
import { AssignFahrzeugToEinheitHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler';
import { GetEinsatzFahrzeugeHandler } from '@application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler';
import { GetKraeftePoisHandler } from '@application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/get-kraefte-pois.handler';

// Commands & Queries
import { ErfasseFahrzeugAusStammdatenCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.command';
import { ErfasseTemporalesFahrzeugCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.command';
import { UpdateFmsStatusCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/update-fms-status/update-fms-status.command';
import { AssignFahrzeugToEinheitCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.command';
import { GetEinsatzFahrzeugeQuery } from '@application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.query';
import { GetKraeftePoisQuery } from '@application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/get-kraefte-pois.query';
import { KraeftePoisFeatureCollectionDto } from '@application/kraefte/einsatz-fahrzeuge/queries/get-kraefte-pois/kraefte-pois.dto';

// DTOs
import { EinsatzFahrzeugDto, ErfasseFahrzeugAusStammdatenDto, ErfasseTemporalesFahrzeugDto, UpdateFmsStatusDto, AssignFahrzeugToEinheitDto } from '@application/kraefte/einsatz-fahrzeuge/dto';

// Error Codes
import { EINSATZ_FAHRZEUG_ERROR_CODES, EinsatzFahrzeugError } from '@domain/kraefte/common/einsatz-fahrzeug-error-codes';

/**
 * Controller für EinsatzFahrzeuge-Verwaltung im Einsatz-Kontext.
 *
 * Ermöglicht das Erfassen von Fahrzeugen aus Stammdaten für einen aktiven Einsatz.
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 *
 * **Story Context:**
 * Story 3-1 (Fahrzeug aus Stammdaten erfassen) - API Layer
 *
 * **AC1 - Stammdaten-Fahrzeug auswählen:**
 * User wählt ein existierendes StammFahrzeug aus der Liste.
 * POST /einsaetze/:einsatzId/fahrzeuge mit { stammId }
 *
 * **AC4 - Duplikat-Validierung:**
 * Wenn Funkrufname bereits im Einsatz existiert → 409 Conflict
 *
 * **AC5 - UI Feedback:**
 * API gibt strukturierte Error Responses für Frontend-Feedback.
 */
@ApiTags('einsatz-fahrzeuge')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/fahrzeuge', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class EinsatzFahrzeugeController {
  constructor(
    private readonly erfasseHandler: ErfasseFahrzeugAusStammdatenHandler,
    private readonly erfasseTemporalesHandler: ErfasseTemporalesFahrzeugHandler,
    private readonly getEinsatzFahrzeugeHandler: GetEinsatzFahrzeugeHandler,
    private readonly updateFmsStatusHandler: UpdateFmsStatusHandler,
    private readonly assignToEinheitHandler: AssignFahrzeugToEinheitHandler,
    private readonly getKraeftePoisHandler: GetKraeftePoisHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle EinsatzFahrzeuge eines Einsatzes auflisten.
   *
   * Gibt alle dem Einsatz zugewiesenen Fahrzeuge zurück.
   * Sortiert nach Funkrufname alphabetisch.
   *
   * @param einsatzId - UUID des Einsatzes
   * @returns Array aller EinsatzFahrzeuge des Einsatzes
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Alle Fahrzeuge eines Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(EinsatzFahrzeugDto, { isArray: true, description: 'Liste aller EinsatzFahrzeuge' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<EinsatzFahrzeugDto[]> {
    const queryResult = GetEinsatzFahrzeugeQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const result = await this.getEinsatzFahrzeugeHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Unexpected error in findAll for Einsatz ${einsatzId}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der EinsatzFahrzeuge');
    }

    return result.value ?? [];
  }

  /**
   * Fahrzeuge als GeoJSON POIs fuer die Lagekarte abrufen.
   *
   * **RFC 7946 Compliance:**
   * - Koordinaten: [longitude, latitude] (NICHT [lat, lng]!)
   * - Feature ID auf Feature-Ebene (nicht in properties)
   * - type: "FeatureCollection" bzw. "Feature"
   *
   * **Filterung:**
   * - Nur Fahrzeuge MIT gueltiger Position werden zurueckgegeben
   * - Fahrzeuge ohne Position werden herausgefiltert
   *
   * @param einsatzId - UUID des Einsatzes
   * @returns GeoJSON FeatureCollection mit allen Fahrzeug-POIs
   */
  @Get('pois')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Fahrzeuge als POIs fuer Lagekarte abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(KraeftePoisFeatureCollectionDto, { description: 'GeoJSON FeatureCollection mit Fahrzeug-POIs' })
  @ApiBadRequestResponse({ description: 'Ungueltige Einsatz-ID' })
  async getKraeftePois(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<KraeftePoisFeatureCollectionDto> {
    const queryResult = GetKraeftePoisQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const result = await this.getKraeftePoisHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Unexpected error in getKraeftePois for Einsatz ${einsatzId}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der Kraefte-POIs');
    }

    return result.value ?? new KraeftePoisFeatureCollectionDto([]);
  }

  /**
   * Fahrzeug aus Stammdaten für einen Einsatz erfassen.
   *
   * **AC1 - Stammdaten-Fahrzeug auswählen:**
   * User wählt ein StammFahrzeug aus der Liste (stammId).
   *
   * **AC2 - Snapshot Pattern:**
   * Backend kopiert funkrufname, kennzeichen, fahrzeugtypId vom StammFahrzeug.
   * Initial-FMS-Status wird auf 2 (Einsatzbereit) gesetzt.
   *
   * **AC3 - Atomare Event-Persistierung:**
   * FahrzeugErfasstEvent wird atomar mit dem Aggregate gespeichert (Outbox).
   *
   * **AC4 - Duplikat-Validierung:**
   * Wenn Funkrufname bereits im Einsatz existiert → 409 Conflict.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - ErfasseFahrzeugAusStammdatenDto mit stammId und optionaler position
   * @returns Das neu erstellte EinsatzFahrzeug
   * @throws NotFoundException wenn StammFahrzeug oder Fahrzeugtyp nicht existiert
   * @throws ConflictException wenn Funkrufname bereits im Einsatz existiert
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Fahrzeug aus Stammdaten für Einsatz erfassen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedCreatedResponse(EinsatzFahrzeugDto, { description: 'Fahrzeug erfolgreich erfasst' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültige stammId)' })
  @ApiNotFoundResponse({ description: 'StammFahrzeug oder Fahrzeugtyp nicht gefunden' })
  @ApiConflictResponse({ description: 'Fahrzeug mit diesem Funkrufnamen bereits im Einsatz erfasst' })
  async erfasseAusStammdaten(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: ErfasseFahrzeugAusStammdatenDto): Promise<EinsatzFahrzeugDto> {
    // Create Command
    const commandResult = ErfasseFahrzeugAusStammdatenCommand.create({
      einsatzId,
      stammId: dto.stammId,
      createdBy: user.userId,
      position: dto.position,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.erfasseHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses (AC5)
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE)) {
        throw new ConflictException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.STAMM_NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.EINSATZ_NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Erfassen des Fahrzeugs');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erfassen des Fahrzeugs');
    }

    // Audit logging
    this.logger.log(`EinsatzFahrzeug erfasst: ${result.value.id} (${result.value.funkrufname}) für Einsatz ${einsatzId} von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Temporäres Fahrzeug für einen Einsatz erfassen.
   *
   * **AC1 - Temporäres Fahrzeug anlegen:**
   * User gibt manuell funkrufname, fahrzeugtypId und optional kennzeichen ein.
   * Kein StammFahrzeug wird referenziert (für externe Kräfte, spontane Einheiten).
   *
   * **AC2 - Snapshot Pattern:**
   * Backend speichert die manuell eingegebenen Daten als Snapshot.
   * Initial-FMS-Status wird auf 2 (Einsatzbereit) gesetzt.
   *
   * **AC3 - Duplikat-Validierung:**
   * Wenn Funkrufname bereits im Einsatz existiert → 409 Conflict.
   *
   * **AC4 - Fahrzeugtyp-Validierung:**
   * Fahrzeugtyp muss existieren (für Kategorisierung).
   *
   * @param einsatzId - UUID des Einsatzes
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - ErfasseTemporalesFahrzeugDto mit funkrufname, fahrzeugtypId
   * @returns Das neu erstellte temporäre EinsatzFahrzeug
   * @throws NotFoundException wenn Fahrzeugtyp nicht existiert
   * @throws ConflictException wenn Funkrufname bereits im Einsatz existiert
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post('temporary')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Temporäres Fahrzeug für Einsatz erfassen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedCreatedResponse(EinsatzFahrzeugDto, { description: 'Temporäres Fahrzeug erfolgreich erfasst' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültiger Funkrufname oder inaktiver Fahrzeugtyp)' })
  @ApiNotFoundResponse({ description: 'Fahrzeugtyp nicht gefunden' })
  @ApiConflictResponse({ description: 'Fahrzeug mit diesem Funkrufnamen bereits im Einsatz erfasst' })
  async erfasseTemporales(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: ErfasseTemporalesFahrzeugDto): Promise<EinsatzFahrzeugDto> {
    // Create Command
    const commandResult = ErfasseTemporalesFahrzeugCommand.create({
      einsatzId,
      fahrzeugtypId: dto.fahrzeugtypId,
      funkrufname: dto.funkrufname,
      createdBy: user.userId,
      kennzeichen: dto.kennzeichen,
      position: dto.position,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.erfasseTemporalesHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses (AC5)
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE)) {
        throw new ConflictException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.EINSATZ_NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.FAHRZEUGTYP_INACTIVE)) {
        throw new BadRequestException(EinsatzFahrzeugError.extractMessage(error));
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Erfassen des temporären Fahrzeugs');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erfassen des temporären Fahrzeugs');
    }

    // Audit logging
    this.logger.log(`Temporäres EinsatzFahrzeug erfasst: ${result.value.id} (${result.value.funkrufname}) für Einsatz ${einsatzId} von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * FMS-Status eines Fahrzeugs aktualisieren.
   *
   * **AC1 - Status-Dropdown:**
   * User wählt neuen Status aus Dropdown (0-9).
   *
   * **AC2 - Domain Event:**
   * FmsStatusGeaendertEvent wird emittiert für ETB-Eintrag.
   *
   * **AC4 - Validierung:**
   * Status muss zwischen 0-9 liegen.
   *
   * **AC5 - Position Update:**
   * Optional kann GPS-Position mitgesendet werden.
   *
   * **Rate Limiting:**
   * Nutzt ADMIN_MUTATION_RATE_LIMIT für häufige Status-Updates.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 des EinsatzFahrzeugs
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - UpdateFmsStatusDto mit neuem Status und optionaler Position
   * @returns Das aktualisierte EinsatzFahrzeug
   * @throws NotFoundException wenn Fahrzeug nicht gefunden
   * @throws BadRequestException bei ungültigem Status
   */
  @Patch(':id/status')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FMS-Status eines Fahrzeugs aktualisieren' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'CUID2 des Einsatz-Fahrzeugs', example: 'clx1234567890abcdef12345' })
  @ApiWrappedResponse(EinsatzFahrzeugDto, { description: 'FMS-Status erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Ungültiger FMS-Status (muss 0-9 sein)' })
  @ApiNotFoundResponse({ description: 'EinsatzFahrzeug nicht gefunden' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
  async updateFmsStatus(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateFmsStatusDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzFahrzeugDto> {
    // Create Command
    const commandResult = UpdateFmsStatusCommand.create({
      einsatzId,
      fahrzeugId: id,
      fmsStatus: dto.fmsStatus,
      updatedBy: user.userId,
      position: dto.position,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.updateFmsStatusHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS)) {
        throw new BadRequestException(EinsatzFahrzeugError.extractMessage(error));
      }
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_POSITION)) {
        throw new BadRequestException(EinsatzFahrzeugError.extractMessage(error));
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Aktualisieren des FMS-Status');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren des FMS-Status');
    }

    // Audit logging
    this.logger.log(`FMS-Status aktualisiert: ${result.value.id} (${result.value.funkrufname}) → Status ${dto.fmsStatus} für Einsatz ${einsatzId} von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Fahrzeug einer taktischen Einheit zuweisen oder Zuweisung entfernen.
   *
   * **Zuweisung:** einheitId mit CUID2 der Einheit senden
   * **Entfernung:** einheitId null oder weglassen
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 des EinsatzFahrzeugs
   * @param dto - AssignFahrzeugToEinheitDto mit einheitId
   * @param user - Aktueller Benutzer (aus JWT Token)
   */
  @Patch(':id/einheit')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fahrzeug einer taktischen Einheit zuweisen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'CUID2 des Einsatz-Fahrzeugs' })
  @ApiOkResponse({ description: 'Fahrzeug erfolgreich zugewiesen' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Fahrzeug oder Einheit nicht gefunden' })
  async assignToEinheit(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: AssignFahrzeugToEinheitDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    // Create Command
    const commandResult = AssignFahrzeugToEinheitCommand.create({
      einsatzId,
      fahrzeugId: id,
      einheitId: dto.einheitId ?? null,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.assignToEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses
      if (EinsatzFahrzeugError.hasCode(error, EINSATZ_FAHRZEUG_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzFahrzeugError.extractMessage(error));
      }

      // Einheit nicht gefunden
      if (error.includes('nicht gefunden')) {
        throw new NotFoundException(error);
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler bei der Einheit-Zuweisung');
    }

    // Audit logging
    this.logger.log(`Fahrzeug ${id} Einheit-Zuweisung geändert: einheitId=${dto.einheitId ?? 'null'} für Einsatz ${einsatzId} von ${user.userId}`);
  }
}
