import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { CreateEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/create-einheit/create-einheit.handler';
import { UpdateEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/update-einheit/update-einheit.handler';
import { ChangeEinheitStatusHandler } from '@application/kraefte/einsatz-einheiten/commands/change-einheit-status/change-einheit-status.handler';
import { SetEinheitenfuehrerHandler } from '@application/kraefte/einsatz-einheiten/commands/set-einheitenfuehrer/set-einheitenfuehrer.handler';
import { AssignPersonToEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/assign-person-to-einheit/assign-person-to-einheit.handler';
import { RemovePersonFromEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/remove-person-from-einheit/remove-person-from-einheit.handler';
import { MoveEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/move-einheit/move-einheit.handler';
import { DeleteEinheitHandler } from '@application/kraefte/einsatz-einheiten/commands/delete-einheit/delete-einheit.handler';
import { GetEinsatzEinheitenHandler } from '@application/kraefte/einsatz-einheiten/queries/get-einsatz-einheiten/get-einsatz-einheiten.handler';
import { GetEinheitDetailsHandler } from '@application/kraefte/einsatz-einheiten/queries/get-einheit-details/get-einheit-details.handler';

// Commands & Queries
import { CreateEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/create-einheit/create-einheit.command';
import { UpdateEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/update-einheit/update-einheit.command';
import { ChangeEinheitStatusCommand } from '@application/kraefte/einsatz-einheiten/commands/change-einheit-status/change-einheit-status.command';
import { SetEinheitenfuehrerCommand } from '@application/kraefte/einsatz-einheiten/commands/set-einheitenfuehrer/set-einheitenfuehrer.command';
import { AssignPersonToEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/assign-person-to-einheit/assign-person-to-einheit.command';
import { RemovePersonFromEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/remove-person-from-einheit/remove-person-from-einheit.command';
import { MoveEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/move-einheit/move-einheit.command';
import { DeleteEinheitCommand } from '@application/kraefte/einsatz-einheiten/commands/delete-einheit/delete-einheit.command';
import { GetEinsatzEinheitenQuery } from '@application/kraefte/einsatz-einheiten/queries/get-einsatz-einheiten/get-einsatz-einheiten.query';
import { GetEinheitDetailsQuery } from '@application/kraefte/einsatz-einheiten/queries/get-einheit-details/get-einheit-details.query';

// DTOs
import {
  EinsatzEinheitDto,
  EinsatzEinheitDetailsDto,
  CreateEinsatzEinheitDto,
  UpdateEinsatzEinheitDto,
  ChangeEinsatzEinheitStatusDto,
  SetEinheitenfuehrerDto,
  AssignPersonToEinheitDto,
  MoveEinheitDto,
  EinheitCreatedResponseDto,
} from '@application/kraefte/einsatz-einheiten/dto';

// Error Codes
import { EINSATZ_EINHEIT_ERROR_CODES, EinsatzEinheitError } from '@domain/kraefte/common/einsatz-einheit-error-codes';

/**
 * Controller für taktische Einheiten-Verwaltung im Einsatz-Kontext.
 *
 * Ermöglicht das Erstellen, Aktualisieren, Löschen und Verwalten von
 * taktischen Einheiten (Trupps, Staffeln, Gruppen, Züge, Abschnitte)
 * innerhalb eines aktiven Einsatzes.
 *
 * **Hierarchie:** Einheiten können hierarchisch organisiert sein (parentId).
 * **Personal:** Personen können Einheiten zugewiesen und ein Einheitenführer gesetzt werden.
 * **Status:** AUFGESTELLT → EINSATZBEREIT → IM_EINSATZ → AUFGELOEST
 *
 * **Issue #411:** Taktische Einheiten
 */
@ApiTags('einsatz-einheiten')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/einheiten', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class EinsatzEinheitenController {
  constructor(
    private readonly createEinheitHandler: CreateEinheitHandler,
    private readonly updateEinheitHandler: UpdateEinheitHandler,
    private readonly changeEinheitStatusHandler: ChangeEinheitStatusHandler,
    private readonly setEinheitenfuehrerHandler: SetEinheitenfuehrerHandler,
    private readonly assignPersonHandler: AssignPersonToEinheitHandler,
    private readonly removePersonHandler: RemovePersonFromEinheitHandler,
    private readonly moveEinheitHandler: MoveEinheitHandler,
    private readonly deleteEinheitHandler: DeleteEinheitHandler,
    private readonly getEinsatzEinheitenHandler: GetEinsatzEinheitenHandler,
    private readonly getEinheitDetailsHandler: GetEinheitDetailsHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle taktischen Einheiten eines Einsatzes auflisten.
   *
   * Gibt alle dem Einsatz zugeordneten Einheiten zurück,
   * inklusive Hierarchie-Informationen (parentId) und Stärkeangaben.
   *
   * @param einsatzId - UUID des Einsatzes
   * @returns Array aller EinsatzEinheiten des Einsatzes
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Alle taktischen Einheiten eines Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(EinsatzEinheitDto, { isArray: true, description: 'Liste aller EinsatzEinheiten' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<EinsatzEinheitDto[]> {
    const queryResult = GetEinsatzEinheitenQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const result = await this.getEinsatzEinheitenHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Unexpected error in findAll for Einsatz ${einsatzId}: ${result.error}`, 'EinsatzEinheitenController');
      throw new InternalServerErrorException('Fehler beim Abrufen der EinsatzEinheiten');
    }

    return result.value ?? [];
  }

  /**
   * Detailansicht einer taktischen Einheit abrufen.
   *
   * Gibt die Einheit inklusive zugewiesener Personen und
   * aufgelöstem Einheitenführer zurück.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @returns EinsatzEinheit mit zugewiesenem Personal
   */
  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Detailansicht einer taktischen Einheit abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiWrappedResponse(EinsatzEinheitDetailsDto, { description: 'Einheit mit zugewiesenem Personal' })
  @ApiBadRequestResponse({ description: 'Ungültige ID' })
  @ApiNotFoundResponse({ description: 'Einheit nicht gefunden' })
  async findOne(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @Param('id', ParseCuidPipe) id: string): Promise<EinsatzEinheitDetailsDto> {
    const queryResult = GetEinheitDetailsQuery.create(einsatzId, id);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const result = await this.getEinheitDetailsHandler.execute(query);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }

      this.logger.error(`Unexpected error in findOne for Einheit ${id}: ${result.error}`, 'EinsatzEinheitenController');
      throw new InternalServerErrorException('Fehler beim Abrufen der Einheit');
    }

    if (!result.value) {
      throw new NotFoundException('Einheit nicht gefunden');
    }

    return result.value;
  }

  /**
   * Neue taktische Einheit erstellen.
   *
   * Erstellt eine neue Einheit im Einsatz. Über parentId kann die
   * hierarchische Zuordnung definiert werden.
   *
   * **Business Rules:**
   * - Name muss innerhalb des Einsatzes eindeutig sein
   * - Typ bestimmt die Größenordnung
   * - InitialStatus: AUFGESTELLT
   *
   * @param einsatzId - UUID des Einsatzes
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - CreateEinsatzEinheitDto mit Name, Typ und optionalen Feldern
   * @returns ID der neu erstellten Einheit
   * @throws ConflictException wenn Name bereits im Einsatz existiert
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neue taktische Einheit erstellen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedCreatedResponse(EinheitCreatedResponseDto, { description: 'Einheit erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiConflictResponse({ description: 'Einheit mit diesem Namen bereits im Einsatz vorhanden' })
  @ApiNotFoundResponse({ description: 'Einsatz oder übergeordnete Einheit nicht gefunden' })
  async create(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: CreateEinsatzEinheitDto): Promise<EinheitCreatedResponseDto> {
    // Command erstellen
    const commandResult = CreateEinheitCommand.create({
      einsatzId,
      name: dto.name,
      typ: dto.typ,
      funktion: dto.funktion,
      parentId: dto.parentId,
      sollStaerke: dto.sollStaerke,
      auftrag: dto.auftrag,
      einsatzort: dto.einsatzort,
      createdBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Command ausführen
    const result = await this.createEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.DUPLICATE_NAME)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR)) {
        throw new BadRequestException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Erstellen der Einheit');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen der Einheit');
    }

    this.logger.log(`EinsatzEinheit erstellt: ${result.value} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');

    return { id: result.value };
  }

  /**
   * Taktische Einheit aktualisieren.
   *
   * Partial Update - nur übergebene Felder werden aktualisiert.
   * Status-Änderungen erfolgen über den separaten /status Endpoint.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - UpdateEinsatzEinheitDto mit optionalen Feldern
   * @returns Aktualisierte Einheit
   * @throws NotFoundException wenn Einheit nicht gefunden
   * @throws ConflictException wenn neuer Name bereits existiert
   */
  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Taktische Einheit aktualisieren' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiWrappedResponse(EinsatzEinheitDto, { description: 'Einheit erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einheit nicht gefunden' })
  @ApiConflictResponse({ description: 'Name bereits im Einsatz vorhanden' })
  async update(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body() dto: UpdateEinsatzEinheitDto,
  ): Promise<EinsatzEinheitDto> {
    const commandResult = UpdateEinheitCommand.create({
      einsatzId,
      einheitId: id,
      name: dto.name,
      typ: dto.typ,
      funktion: dto.funktion,
      parentId: dto.parentId,
      sollStaerke: dto.sollStaerke,
      auftrag: dto.auftrag,
      einsatzort: dto.einsatzort,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.updateEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.DUPLICATE_NAME)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR)) {
        throw new BadRequestException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Aktualisieren der Einheit');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren der Einheit');
    }

    this.logger.log(`EinsatzEinheit aktualisiert: ${id} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');

    return result.value;
  }

  /**
   * Status einer taktischen Einheit ändern.
   *
   * **Gültige Status-Übergänge:**
   * AUFGESTELLT → EINSATZBEREIT → IM_EINSATZ → AUFGELOEST
   * Sowie IN_RESERVE als Zwischenstatus.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - ChangeEinsatzEinheitStatusDto mit neuem Status
   * @returns Aktualisierte Einheit
   * @throws NotFoundException wenn Einheit nicht gefunden
   * @throws BadRequestException bei ungültigem Status
   */
  @Patch(':id/status')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Status einer taktischen Einheit ändern' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiWrappedResponse(EinsatzEinheitDto, { description: 'Status erfolgreich geändert' })
  @ApiBadRequestResponse({ description: 'Ungültiger Status' })
  @ApiNotFoundResponse({ description: 'Einheit nicht gefunden' })
  async changeStatus(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body() dto: ChangeEinsatzEinheitStatusDto,
  ): Promise<EinsatzEinheitDto> {
    const commandResult = ChangeEinheitStatusCommand.create({
      einsatzId,
      einheitId: id,
      status: dto.status,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.changeEinheitStatusHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.VALIDATION_ERROR)) {
        throw new BadRequestException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Ändern des Status');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Ändern des Status');
    }

    this.logger.log(`EinsatzEinheit Status geändert: ${id} → ${dto.status} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');

    return result.value;
  }

  /**
   * Einheitenführer setzen oder entfernen.
   *
   * **Business Rules:**
   * - fuehrerId gesetzt: Weist EinsatzPerson als Einheitenführer zu
   * - fuehrerId null/undefined: Entfernt aktuellen Einheitenführer
   * - Person muss der Einheit bereits zugewiesen sein
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - SetEinheitenfuehrerDto mit fuehrerId
   * @returns Aktualisierte Einheit
   * @throws NotFoundException wenn Einheit oder Führer nicht gefunden
   */
  @Patch(':id/fuehrer')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Einheitenführer setzen oder entfernen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiWrappedResponse(EinsatzEinheitDto, { description: 'Einheitenführer erfolgreich gesetzt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einheit oder Führer nicht gefunden' })
  async setFuehrer(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body() dto: SetEinheitenfuehrerDto,
  ): Promise<EinsatzEinheitDto> {
    const commandResult = SetEinheitenfuehrerCommand.create({
      einsatzId,
      einheitId: id,
      fuehrerId: dto.fuehrerId ?? null,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.setEinheitenfuehrerHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.FUEHRER_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Setzen des Einheitenführers');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Setzen des Einheitenführers');
    }

    this.logger.log(`Einheitenführer gesetzt: Einheit ${id}, Führer ${dto.fuehrerId ?? 'entfernt'} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');

    return result.value;
  }

  /**
   * Person einer taktischen Einheit zuweisen.
   *
   * **Business Rules:**
   * - Person und Einheit müssen zum gleichen Einsatz gehören
   * - Doppelte Zuweisungen werden verhindert
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - AssignPersonToEinheitDto mit personId
   * @throws NotFoundException wenn Einheit oder Person nicht gefunden
   * @throws ConflictException wenn Person bereits zugewiesen
   */
  @Post(':id/personen')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Person einer taktischen Einheit zuweisen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiCreatedResponse({ description: 'Person erfolgreich zugewiesen' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einheit oder Person nicht gefunden' })
  @ApiConflictResponse({ description: 'Person bereits dieser Einheit zugewiesen' })
  async assignPerson(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body() dto: AssignPersonToEinheitDto,
  ): Promise<void> {
    const commandResult = AssignPersonToEinheitCommand.create({
      einsatzId,
      einheitId: id,
      personId: dto.personId,
      createdBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.assignPersonHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.PERSON_ALREADY_ASSIGNED)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Zuweisen der Person');
    }

    this.logger.log(`Person ${dto.personId} der Einheit ${id} zugewiesen für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');
  }

  /**
   * Person von einer taktischen Einheit entfernen.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param personId - CUID2 der zu entfernenden EinsatzPerson
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @throws NotFoundException wenn Einheit oder Person nicht gefunden
   */
  @Delete(':id/personen/:personId')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Person von einer taktischen Einheit entfernen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiParam({ name: 'personId', type: String, format: 'cuid2', description: 'EinsatzPerson-ID (CUID2)' })
  @ApiOkResponse({ description: 'Person erfolgreich entfernt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einheit oder Person nicht gefunden' })
  async removePerson(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Param('personId', ParseCuidPipe) personId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const commandResult = RemovePersonFromEinheitCommand.create({
      einsatzId,
      einheitId: id,
      personId,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.removePersonHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.PERSON_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Entfernen der Person');
    }

    this.logger.log(`Person ${personId} von Einheit ${id} entfernt für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');
  }

  /**
   * Einheit in der Hierarchie verschieben.
   *
   * **Business Rules:**
   * - parentId gesetzt: Verschiebt unter angegebene übergeordnete Einheit
   * - parentId null: Macht Einheit zu Root-Einheit
   * - Zirkuläre Referenzen werden verhindert
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @param dto - MoveEinheitDto mit neuer parentId
   * @returns Aktualisierte Einheit
   * @throws NotFoundException wenn Einheit nicht gefunden
   * @throws ConflictException bei zirkulärer Hierarchie
   */
  @Patch(':id/parent')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Einheit in der Hierarchie verschieben' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiWrappedResponse(EinsatzEinheitDto, { description: 'Einheit erfolgreich verschoben' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einheit nicht gefunden' })
  @ApiConflictResponse({ description: 'Zirkuläre Hierarchie erkannt' })
  async move(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('id', ParseCuidPipe) id: string,
    @CurrentUser() user: ValidatedUser,
    @Body() dto: MoveEinheitDto,
  ): Promise<EinsatzEinheitDto> {
    const commandResult = MoveEinheitCommand.create({
      einsatzId,
      einheitId: id,
      parentId: dto.parentId ?? null,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.moveEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.CIRCULAR_HIERARCHY)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Verschieben der Einheit');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Verschieben der Einheit');
    }

    this.logger.log(`EinsatzEinheit verschoben: ${id} → Parent ${dto.parentId ?? 'Root'} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');

    return result.value;
  }

  /**
   * Taktische Einheit löschen.
   *
   * **Business Rules:**
   * - Einheit darf keine untergeordneten Einheiten haben
   * - Einheit darf keine zugewiesenen Personen haben
   * - Einheitenführer-Referenzen werden automatisch bereinigt
   *
   * @param einsatzId - UUID des Einsatzes
   * @param id - CUID2 der EinsatzEinheit
   * @param user - Aktueller Benutzer (aus JWT Token)
   * @throws NotFoundException wenn Einheit nicht gefunden
   * @throws ConflictException wenn Einheit Kinder oder Personen hat
   */
  @Delete(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Taktische Einheit löschen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, format: 'cuid2', description: 'EinsatzEinheit-ID (CUID2)' })
  @ApiOkResponse({ description: 'Einheit erfolgreich gelöscht' })
  @ApiNotFoundResponse({ description: 'Einheit nicht gefunden' })
  @ApiConflictResponse({ description: 'Einheit hat Kinder oder zugewiesene Personen' })
  async delete(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const commandResult = DeleteEinheitCommand.create({
      einsatzId,
      einheitId: id,
      deletedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.deleteEinheitHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.EINHEIT_NOT_FOUND)) {
        throw new NotFoundException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.HAS_CHILDREN)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }
      if (EinsatzEinheitError.hasCode(error, EINSATZ_EINHEIT_ERROR_CODES.HAS_PERSONEN)) {
        throw new ConflictException(EinsatzEinheitError.extractMessage(error));
      }

      throw new BadRequestException(error || 'Fehler beim Löschen der Einheit');
    }

    this.logger.log(`EinsatzEinheit gelöscht: ${id} für Einsatz ${einsatzId} von User ${user.userId}`, 'EinsatzEinheitenController');
  }
}
