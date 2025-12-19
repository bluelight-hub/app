import { Controller, Get, Post, Body, Param, UseGuards, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException, HttpCode, HttpStatus, Inject } from '@nestjs/common';
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

// Handlers
import { RegistrierePersonHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.handler';
import { RegistrierePersonViaQrCodeHandler } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.handler';
import { GetEinsatzPersonenHandler } from '@application/kraefte/einsatz-personen/queries/get-einsatz-personen/get-einsatz-personen.handler';

// Commands & Queries
import { RegistrierePersonCommand } from '@application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.command';
import { RegistrierePersonViaQrCodeCommand } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.command';
import { GetEinsatzPersonenQuery } from '@application/kraefte/einsatz-personen/queries/get-einsatz-personen/get-einsatz-personen.query';

// DTOs
import { EinsatzPersonResponseDto, RegistrierePersonDto } from '@application/kraefte/einsatz-personen/dto';
import { RegistrierePersonViaQrCodeDto } from '@application/kraefte/einsatz-personen/dto/registriere-person-qr.dto';

// Error Codes
import { EINSATZ_PERSON_ERROR_CODES, EinsatzPersonError } from '@domain/kraefte/common/einsatz-person-error-codes';

/**
 * Controller für EinsatzPersonen-Verwaltung im Einsatz-Kontext.
 *
 * Ermöglicht das Registrieren von Personen (aus Stammdaten oder manuell) für einen aktiven Einsatz.
 * Alle Endpoints sind mit JwtAuthGuard geschützt.
 *
 * **Story Context:**
 * Story 4-1 (Person manuell registrieren) - API Layer
 *
 * **AC1 - Stammdaten-Person auswählen (optional):**
 * User kann eine existierende StammPerson aus Autocomplete auswählen.
 * POST /einsaetze/:einsatzId/personen mit { stammPersonId, funktion }
 *
 * **AC2 - Manuelle Erfassung:**
 * User kann Person ohne Stammdaten-Referenz erfassen.
 * POST /einsaetze/:einsatzId/personen mit { vorname, nachname, funktion }
 *
 * **AC3 - Duplikat-Validierung:**
 * Wenn StammPerson bereits im Einsatz registriert ist → 409 Conflict
 *
 * **AC4 - UI Feedback:**
 * API gibt strukturierte Error Responses für Frontend-Feedback.
 */
@ApiTags('einsatz-personen')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/personen', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class EinsatzPersonenController {
  constructor(
    private readonly registrierePersonHandler: RegistrierePersonHandler,
    private readonly registrierePersonViaQrHandler: RegistrierePersonViaQrCodeHandler,
    private readonly getEinsatzPersonenHandler: GetEinsatzPersonenHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle EinsatzPersonen eines Einsatzes auflisten.
   *
   * Gibt alle dem Einsatz registrierten Personen zurück.
   * Sortiert nach Erfassungszeitpunkt (neueste zuerst).
   *
   * @param einsatzId - UUID des Einsatzes
   * @returns Array aller EinsatzPersonen des Einsatzes
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Alle Personen eines Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiOkResponse({ type: EinsatzPersonResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<EinsatzPersonResponseDto[]> {
    const queryResult = GetEinsatzPersonenQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const result = await this.getEinsatzPersonenHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Unexpected error in findAll for Einsatz ${einsatzId}: ${result.error}`, 'EinsatzPersonenController');
      throw new InternalServerErrorException('Fehler beim Abrufen der EinsatzPersonen');
    }

    return result.value ?? [];
  }

  /**
   * Person zu einem Einsatz registrieren.
   *
   * **AC1 - Stammdaten-Person auswählen (optional):**
   * User wählt optional eine StammPerson aus Autocomplete (stammPersonId).
   * Backend kopiert vorname, nachname, funkrufname, qualifikationIds vom StammPerson Snapshot.
   *
   * **AC2 - Manuelle Erfassung:**
   * Falls stammPersonId nicht gesetzt: User gibt vorname, nachname, funktion manuell ein.
   * Backend erstellt temporäre EinsatzPerson ohne Stammdaten-Referenz.
   *
   * **AC3 - Atomare Event-Persistierung:**
   * PersonRegistriertEvent wird atomar mit dem Aggregate gespeichert (Outbox).
   *
   * **AC4 - Duplikat-Validierung:**
   * Wenn StammPerson bereits im Einsatz registriert ist → 409 Conflict.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - RegistrierePersonDto mit stammPersonId (optional) und Person-Daten
   * @returns Die neu erstellte EinsatzPerson ID
   * @throws NotFoundException wenn StammPerson nicht existiert
   * @throws ConflictException wenn StammPerson bereits im Einsatz registriert ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Person für Einsatz registrieren' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiCreatedResponse({
    description: 'Person erfolgreich registriert',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'cuid2', example: 'clx1234567890abcdef12345' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültige Daten)' })
  @ApiNotFoundResponse({ description: 'StammPerson nicht gefunden oder archiviert' })
  @ApiConflictResponse({ description: 'Person mit dieser StammPerson-ID bereits im Einsatz registriert' })
  async registrierePerson(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: RegistrierePersonDto): Promise<{ id: string }> {
    // Create Command
    const commandResult = RegistrierePersonCommand.create({
      einsatzId,
      stammPersonId: dto.stammPersonId,
      vorname: dto.vorname,
      nachname: dto.nachname,
      funktion: dto.funktion,
      funkrufname: dto.funkrufname,
      qualifikationIds: dto.qualifikationIds,
      registriertVon: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.registrierePersonHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses (AC4)
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON)) {
        throw new ConflictException(EinsatzPersonError.extractMessage(error));
      }
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(error));
      }
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.EINSATZ_NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(error));
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Registrieren der Person');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Registrieren der Person');
    }

    // Audit logging
    this.logger.log(`EinsatzPerson registriert: ${result.value} (${dto.vorname} ${dto.nachname}) für Einsatz ${einsatzId} von Admin ${user.userId}`, 'EinsatzPersonenController');

    return { id: result.value };
  }

  /**
   * Person via QR-Code registrieren (DRK-App Format).
   *
   * **AC2 - DRK-Format dekodieren:**
   * Frontend parst QR-Code im DRK-Format und sendet extrahierte Daten.
   * Format: drk://person?mnr={personalnummer}&vn={vorname}&nn={nachname}[&fk={funkkennung}]
   *
   * **AC3 - Stammdaten-Lookup via Personalnummer:**
   * Backend sucht StammPerson via personalnummer (mnr Parameter).
   * Bei Treffer: Qualifikationen und Funktion werden uebernommen.
   * Kein Treffer: Temporaere Person ohne Stammdaten-Referenz.
   *
   * **AC4 - Automatische Registrierung:**
   * Bei erfolgreichem Scan wird Person direkt registriert (kein Bestaetigungsbutton).
   *
   * **AC5 - Performance <3s:**
   * Gesamtdauer von Scan bis Toast unter 3 Sekunden.
   *
   * @param einsatzId - UUID des Einsatzes
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - RegistrierePersonViaQrCodeDto mit QR-Daten
   * @returns Die neu erstellte EinsatzPerson ID
   * @throws ConflictException wenn StammPerson bereits im Einsatz registriert ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post('qr')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Person via QR-Code registrieren (DRK-Format)' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiCreatedResponse({
    description: 'Person erfolgreich via QR-Code registriert',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'cuid2', example: 'clx1234567890abcdef12345' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Ungueltige QR-Daten oder Validierungsfehler' })
  @ApiConflictResponse({ description: 'Person bereits im Einsatz erfasst (Duplikat)' })
  async registriereViaQr(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: RegistrierePersonViaQrCodeDto): Promise<{ id: string }> {
    // Create Command
    const commandResult = RegistrierePersonViaQrCodeCommand.create({
      einsatzId,
      personalnummer: dto.personalnummer,
      vorname: dto.vorname,
      nachname: dto.nachname,
      funkkennung: dto.funkkennung,
      registriertVon: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.registrierePersonViaQrHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Check error codes for proper HTTP responses (AC4)
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_PERSON)) {
        throw new ConflictException(EinsatzPersonError.extractMessage(error));
      }
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.STAMM_NOT_FOUND)) {
        // Archivierte StammPerson - als BadRequest behandeln (nicht NotFound)
        throw new BadRequestException(EinsatzPersonError.extractMessage(error));
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Registrieren der Person via QR');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Registrieren der Person via QR');
    }

    // Audit logging
    this.logger.log(
      `EinsatzPerson via QR registriert: ${result.value} (${dto.vorname} ${dto.nachname}, Personalnummer: ${dto.personalnummer}) fuer Einsatz ${einsatzId} von Admin ${user.userId}`,
      'EinsatzPersonenController',
    );

    return { id: result.value };
  }
}
