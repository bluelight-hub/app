import {
  Controller,
  Get,
  Post,
  Put,
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
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
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
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
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
import { GetEinsatzPersonByIdHandler } from '@application/kraefte/einsatz-personen/queries/get-einsatz-person-by-id/get-einsatz-person-by-id.handler';
import { WeisePersonZuFahrzeugZuHandler } from '@application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.handler';
import { EntfernePersonVonFahrzeugHandler } from '@application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.handler';

// Commands & Queries
import { RegistrierePersonCommand } from '@application/kraefte/einsatz-personen/commands/registriere-person/registriere-person.command';
import { RegistrierePersonViaQrCodeCommand } from '@application/kraefte/einsatz-personen/commands/registriere-person-qr/registriere-person-qr.command';
import { GetEinsatzPersonenQuery } from '@application/kraefte/einsatz-personen/queries/get-einsatz-personen/get-einsatz-personen.query';
import { GetEinsatzPersonByIdQuery } from '@application/kraefte/einsatz-personen/queries/get-einsatz-person-by-id/get-einsatz-person-by-id.query';
import { WeisePersonZuFahrzeugZuCommand } from '@application/kraefte/einsatz-personen/commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.command';
import { EntfernePersonVonFahrzeugCommand } from '@application/kraefte/einsatz-personen/commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.command';

// DTOs
import { EinsatzPersonResponseDto, RegistrierePersonDto, PersonRegisteredResponseDto } from '@application/kraefte/einsatz-personen/dto';
import { RegistrierePersonViaQrCodeDto } from '@application/kraefte/einsatz-personen/dto/registriere-person-qr.dto';
import { WeisePersonZuFahrzeugZuDto } from '@application/kraefte/einsatz-personen/dto/weise-person-zu-fahrzeug.dto';

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
    private readonly getEinsatzPersonByIdHandler: GetEinsatzPersonByIdHandler,
    private readonly weisePersonZuFahrzeugHandler: WeisePersonZuFahrzeugZuHandler,
    private readonly entfernePersonVonFahrzeugHandler: EntfernePersonVonFahrzeugHandler,
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
  @ApiWrappedResponse(EinsatzPersonResponseDto, { isArray: true, description: 'Liste aller EinsatzPersonen des Einsatzes' })
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
  @ApiWrappedCreatedResponse(PersonRegisteredResponseDto, { description: 'Person erfolgreich registriert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. ungültige Daten)' })
  @ApiNotFoundResponse({ description: 'StammPerson nicht gefunden oder archiviert' })
  @ApiConflictResponse({ description: 'Person mit dieser StammPerson-ID bereits im Einsatz registriert' })
  async registrierePerson(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: RegistrierePersonDto): Promise<PersonRegisteredResponseDto> {
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

      // Infrastructure errors (500 Internal Server Error)
      if (
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.STAMM_LOOKUP_FAILED) ||
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_CHECK_FAILED) ||
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED)
      ) {
        this.logger.error(`Infrastructure error in person registration: ${error}`, 'EinsatzPersonenController');
        throw new InternalServerErrorException('Fehler beim Registrieren der Person');
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Registrieren der Person');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Registrieren der Person');
    }

    /**
     * GDPR-konformes Audit-Logging OHNE PII (Personally Identifiable Information).
     *
     * Logged werden NUR:
     * - EinsatzPerson ID (technischer Identifier)
     * - Einsatz ID (technischer Identifier)
     * - User ID (technischer Identifier)
     *
     * NICHT geloggt: Vorname, Nachname, Personalnummer (PII!)
     */
    this.logger.log(`EinsatzPerson registriert: ${result.value} fuer Einsatz ${einsatzId} von Admin ${user.userId}`, 'EinsatzPersonenController');

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
   * @throws NotFoundException wenn Einsatz nicht gefunden wurde
   * @throws ConflictException wenn StammPerson bereits im Einsatz registriert ist
   * @throws BadRequestException bei Validierungsfehlern
   * @throws InternalServerErrorException bei Infrastructure-Fehlern (DB, Stammdaten-Lookup)
   */
  @Post('qr')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // Higher limit for QR scanning: 30 per minute
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Person via QR-Code registrieren (DRK-Format)' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedCreatedResponse(PersonRegisteredResponseDto, { description: 'Person erfolgreich via QR-Code registriert' })
  @ApiBadRequestResponse({ description: 'Ungueltige QR-Daten oder Validierungsfehler' })
  @ApiNotFoundResponse({ description: 'Einsatz nicht gefunden' })
  @ApiConflictResponse({ description: 'Person bereits im Einsatz erfasst (Duplikat)' })
  async registriereViaQr(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: RegistrierePersonViaQrCodeDto): Promise<PersonRegisteredResponseDto> {
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
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.STAMM_ARCHIVED)) {
        // Archivierte StammPerson - als BadRequest behandeln (nicht NotFound)
        throw new BadRequestException(EinsatzPersonError.extractMessage(error));
      }
      if (EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.EINSATZ_NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(error));
      }
      // NOTE: STAMM_NOT_FOUND wird vom Handler NICHT returned (Temporäre Person wird erstellt)

      // Infrastructure errors (500 Internal Server Error)
      if (
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.STAMM_LOOKUP_FAILED) ||
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_CHECK_FAILED) ||
        EinsatzPersonError.hasCode(error, EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED)
      ) {
        this.logger.error(`Infrastructure error in QR registration: ${error}`, 'EinsatzPersonenController');
        throw new InternalServerErrorException('Fehler beim Registrieren der Person');
      }

      // Generic error
      throw new BadRequestException(error || 'Fehler beim Registrieren der Person via QR');
    }

    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Registrieren der Person via QR');
    }

    /**
     * GDPR-konformes Audit-Logging OHNE PII (Personally Identifiable Information).
     *
     * Logged werden NUR:
     * - EinsatzPerson ID (technischer Identifier)
     * - Einsatz ID (technischer Identifier)
     * - User ID (technischer Identifier)
     *
     * NICHT geloggt: Vorname, Nachname, Personalnummer (PII!)
     */
    this.logger.log(`EinsatzPerson via QR registriert: ${result.value} fuer Einsatz ${einsatzId} von Admin ${user.userId}`, 'EinsatzPersonenController');

    return { id: result.value };
  }

  /**
   * Weist eine Person einem Fahrzeug zu.
   *
   * Business Rules:
   * - Person und Fahrzeug müssen im gleichen Einsatz sein
   * - Vorherige Zuweisung wird überschrieben (keine explizite Entfernung nötig)
   * - Erzeugt automatisch ETB-Eintrag
   */
  @Put(':personId/fahrzeug')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Person zu Fahrzeug zuweisen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'personId', type: String, format: 'cuid', description: 'EinsatzPerson-ID (CUID)' })
  @ApiWrappedResponse(EinsatzPersonResponseDto, { description: 'Person erfolgreich zugewiesen' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige IDs' })
  @ApiNotFoundResponse({ description: 'Person oder Fahrzeug nicht gefunden' })
  @ApiConflictResponse({ description: 'Fahrzeug gehört zu anderem Einsatz' })
  async weiseZuFahrzeug(
    @Param('einsatzId', ParseCuidPipe) einsatzId: string,
    @Param('personId', ParseCuidPipe) personId: string,
    @Body() dto: WeisePersonZuFahrzeugZuDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzPersonResponseDto> {
    this.logger.log(`Weise Person ${personId} zu Fahrzeug ${dto.fahrzeugId} zu (Einsatz: ${einsatzId})`, 'EinsatzPersonenController');

    // Command erstellen
    const commandResult = WeisePersonZuFahrzeugZuCommand.create({
      einsatzId,
      personId,
      fahrzeugId: dto.fahrzeugId,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Command ausführen (Result Pattern - keine Exceptions)
    const result = await this.weisePersonZuFahrzeugHandler.execute(command);

    if (result.isFailure) {
      const errorMessage = result.error ?? '';

      if (EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(errorMessage));
      }
      if (EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(errorMessage));
      }
      if (EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.FAHRZEUG_NOT_IN_SAME_EINSATZ)) {
        throw new BadRequestException(EinsatzPersonError.extractMessage(errorMessage));
      }

      // Infrastructure errors (500 Internal Server Error)
      if (
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.STAMM_LOOKUP_FAILED) ||
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_CHECK_FAILED) ||
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED)
      ) {
        this.logger.error(`Infrastructure error in assignment: ${errorMessage}`, 'EinsatzPersonenController');
        throw new InternalServerErrorException('Fehler beim Zuweisen der Person zu Fahrzeug');
      }

      this.logger.error(`Fehler beim Zuweisen von Person ${personId} zu Fahrzeug: ${errorMessage}`, 'EinsatzPersonenController');
      throw new BadRequestException(errorMessage);
    }

    // Aktualisierte Person zurückgeben (dedicated query statt N+1)
    const queryResult = GetEinsatzPersonByIdQuery.create(personId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    const personResult = await this.getEinsatzPersonByIdHandler.execute(query);
    if (personResult.isFailure) {
      this.logger.error(`Fehler beim Laden der Person ${personId}: ${personResult.error}`, 'EinsatzPersonenController');
      throw new InternalServerErrorException('Fehler beim Laden der Person');
    }

    const person = personResult.value;
    if (!person) {
      throw new NotFoundException('Person nach Zuweisung nicht gefunden');
    }

    return person;
  }

  /**
   * Entfernt eine Person von ihrem zugewiesenen Fahrzeug.
   *
   * Business Rules:
   * - Idempotent: Wenn Person keinem Fahrzeug zugewiesen ist, Success
   * - Erzeugt automatisch ETB-Eintrag
   */
  @Delete(':personId/fahrzeug')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Person von Fahrzeug entfernen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'personId', type: String, format: 'cuid', description: 'EinsatzPerson-ID (CUID)' })
  @ApiNoContentResponse({ description: 'Person erfolgreich von Fahrzeug entfernt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige IDs' })
  @ApiNotFoundResponse({ description: 'Person nicht gefunden' })
  async entferneVonFahrzeug(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @Param('personId', ParseCuidPipe) personId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    this.logger.log(`Entferne Person ${personId} von Fahrzeug (Einsatz: ${einsatzId})`, 'EinsatzPersonenController');

    // Command erstellen
    const commandResult = EntfernePersonVonFahrzeugCommand.create({
      einsatzId,
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

    // Command ausführen (Result Pattern - keine Exceptions)
    const result = await this.entfernePersonVonFahrzeugHandler.execute(command);

    if (result.isFailure) {
      const errorMessage = result.error ?? '';

      if (EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(EinsatzPersonError.extractMessage(errorMessage));
      }

      // Infrastructure errors (500 Internal Server Error)
      if (
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.STAMM_LOOKUP_FAILED) ||
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.DUPLICATE_CHECK_FAILED) ||
        EinsatzPersonError.hasCode(errorMessage, EINSATZ_PERSON_ERROR_CODES.SAVE_FAILED)
      ) {
        this.logger.error(`Infrastructure error in removal: ${errorMessage}`, 'EinsatzPersonenController');
        throw new InternalServerErrorException('Fehler beim Entfernen der Person von Fahrzeug');
      }

      this.logger.error(`Fehler beim Entfernen von Person ${personId} von Fahrzeug: ${errorMessage}`, 'EinsatzPersonenController');
      throw new BadRequestException(errorMessage);
    }
  }
}
