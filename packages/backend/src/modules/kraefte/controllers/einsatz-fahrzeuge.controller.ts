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
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { ErfasseFahrzeugAusStammdatenHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.handler';
import { ErfasseTemporalesFahrzeugHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler';
import { UpdateFmsStatusHandler } from '@application/kraefte/einsatz-fahrzeuge/commands/update-fms-status/update-fms-status.handler';
import { GetEinsatzFahrzeugeHandler } from '@application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler';

// Commands & Queries
import { ErfasseFahrzeugAusStammdatenCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.command';
import { ErfasseTemporalesFahrzeugCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.command';
import { UpdateFmsStatusCommand } from '@application/kraefte/einsatz-fahrzeuge/commands/update-fms-status/update-fms-status.command';
import { GetEinsatzFahrzeugeQuery } from '@application/kraefte/einsatz-fahrzeuge/queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.query';

// DTOs
import { EinsatzFahrzeugDto, ErfasseFahrzeugAusStammdatenDto, ErfasseTemporalesFahrzeugDto, UpdateFmsStatusDto } from '@application/kraefte/einsatz-fahrzeuge/dto';

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
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/fahrzeuge', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class EinsatzFahrzeugeController {
  private readonly logger = new Logger(EinsatzFahrzeugeController.name);

  constructor(
    private readonly erfasseHandler: ErfasseFahrzeugAusStammdatenHandler,
    private readonly erfasseTemporalesHandler: ErfasseTemporalesFahrzeugHandler,
    private readonly getEinsatzFahrzeugeHandler: GetEinsatzFahrzeugeHandler,
    private readonly updateFmsStatusHandler: UpdateFmsStatusHandler,
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
  @ApiParam({ name: 'einsatzId', type: String, format: 'uuid', description: 'Einsatz-ID (UUID)' })
  @ApiOkResponse({ type: EinsatzFahrzeugDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId', ParseUUIDPipe) einsatzId: string): Promise<EinsatzFahrzeugDto[]> {
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
  @ApiParam({ name: 'einsatzId', type: String, format: 'uuid', description: 'Einsatz-ID (UUID)' })
  @ApiCreatedResponse({ type: EinsatzFahrzeugDto, description: 'Fahrzeug erfolgreich erfasst' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültige stammId)' })
  @ApiNotFoundResponse({ description: 'StammFahrzeug oder Fahrzeugtyp nicht gefunden' })
  @ApiConflictResponse({ description: 'Fahrzeug mit diesem Funkrufnamen bereits im Einsatz erfasst' })
  async erfasseAusStammdaten(@Param('einsatzId', ParseUUIDPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: ErfasseFahrzeugAusStammdatenDto): Promise<EinsatzFahrzeugDto> {
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
  @ApiParam({ name: 'einsatzId', type: String, format: 'uuid', description: 'Einsatz-ID (UUID)' })
  @ApiCreatedResponse({ type: EinsatzFahrzeugDto, description: 'Temporäres Fahrzeug erfolgreich erfasst' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültiger Funkrufname)' })
  @ApiNotFoundResponse({ description: 'Fahrzeugtyp nicht gefunden' })
  @ApiConflictResponse({ description: 'Fahrzeug mit diesem Funkrufnamen bereits im Einsatz erfasst' })
  async erfasseTemporales(@Param('einsatzId', ParseUUIDPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: ErfasseTemporalesFahrzeugDto): Promise<EinsatzFahrzeugDto> {
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
  @ApiParam({ name: 'einsatzId', type: String, format: 'uuid', description: 'Einsatz-ID (UUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'CUID2 des Einsatz-Fahrzeugs', example: 'clx1234567890abcdef12345' })
  @ApiOkResponse({ type: EinsatzFahrzeugDto, description: 'FMS-Status erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Ungültiger FMS-Status (muss 0-9 sein)' })
  @ApiNotFoundResponse({ description: 'EinsatzFahrzeug nicht gefunden' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
  async updateFmsStatus(
    @Param('einsatzId', ParseUUIDPipe) einsatzId: string,
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
}
