import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { CreateStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands/create-stamm-fahrzeug/create-stamm-fahrzeug.handler';
import { UpdateStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands/update-stamm-fahrzeug/update-stamm-fahrzeug.handler';
import { ArchiveStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands/archive-stamm-fahrzeug/archive-stamm-fahrzeug.handler';
import { GetAllStammFahrzeugeHandler } from '@application/kraefte/stamm-fahrzeuge/queries/get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.handler';
import { GetStammFahrzeugByIdHandler } from '@application/kraefte/stamm-fahrzeuge/queries/get-stamm-fahrzeug-by-id/get-stamm-fahrzeug-by-id.handler';

// Commands & Queries
import { CreateStammFahrzeugCommand } from '@application/kraefte/stamm-fahrzeuge/commands/create-stamm-fahrzeug/create-stamm-fahrzeug.command';
import { UpdateStammFahrzeugCommand } from '@application/kraefte/stamm-fahrzeuge/commands/update-stamm-fahrzeug/update-stamm-fahrzeug.command';
import { ArchiveStammFahrzeugCommand } from '@application/kraefte/stamm-fahrzeuge/commands/archive-stamm-fahrzeug/archive-stamm-fahrzeug.command';
import { GetAllStammFahrzeugeQuery } from '@application/kraefte/stamm-fahrzeuge/queries/get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.query';
import { GetStammFahrzeugByIdQuery } from '@application/kraefte/stamm-fahrzeuge/queries/get-stamm-fahrzeug-by-id/get-stamm-fahrzeug-by-id.query';

// DTOs
import { StammFahrzeugDto } from '@application/kraefte/stamm-fahrzeuge/dto/stamm-fahrzeug.dto';
import { CreateStammFahrzeugDto } from '@application/kraefte/stamm-fahrzeuge/dto/create-stamm-fahrzeug.dto';
import { UpdateStammFahrzeugDto } from '@application/kraefte/stamm-fahrzeuge/dto/update-stamm-fahrzeug.dto';

// Error Codes
import { STAMM_FAHRZEUG_ERROR_CODES, StammFahrzeugError } from '@domain/kraefte/common/stamm-fahrzeug-error-codes';

/**
 * Admin Controller für Stamm-Fahrzeuge-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können Stamm-Fahrzeuge verwalten.
 *
 * **Authorization Design:**
 * - WARUM keine createdBy/updatedBy Prüfung gegen aktuellen User:
 *   - Admin darf ALLE Fahrzeuge verwalten (unabhängig davon, wer sie erstellt hat)
 *   - createdBy/updatedBy sind NUR für Audit-Trail (Nachvollziehbarkeit)
 *   - Keine Ownership-basierte Autorisierung auf Fahrzeug-Ebene
 *   - Fahrzeuge sind globale Stammdaten (keine User-spezifischen Ressourcen)
 *   - AdminJwtAuthGuard stellt sicher, dass nur Admins überhaupt Zugriff haben
 *
 * **Archive-Pattern (Soft-Delete):**
 * - Fahrzeuge werden NIEMALS physisch gelöscht (referentielle Integrität)
 * - Archivierte Fahrzeuge: archivedAt + archivedBy gesetzt
 * - Default-Listen blenden archivierte Fahrzeuge aus
 * - includeArchived Query-Parameter zeigt auch archivierte Fahrzeuge
 *
 * **IMMUTABLE fahrzeugtypId:**
 * - Fahrzeugtyp kann nach Erstellung NICHT geändert werden
 * - Grund: Fahrzeugtyp definiert Sollbesatzung und Einsatzplanung
 * - Bei Umrüstung: altes Fahrzeug archivieren, neues Fahrzeug anlegen
 *
 * Rate Limiting (Controller-Level):
 * - GET-Endpoints: Max. 30 Anfragen pro Minute (Lese-Operationen)
 * - Mutationen (POST/PATCH): Max. 10 Anfragen pro Minute (Schreib-Operationen)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-stammdaten-fahrzeuge')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/stammdaten/fahrzeuge', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminStammFahrzeugeController {
  constructor(
    private readonly createHandler: CreateStammFahrzeugHandler,
    private readonly updateHandler: UpdateStammFahrzeugHandler,
    private readonly archiveHandler: ArchiveStammFahrzeugHandler,
    private readonly getAllHandler: GetAllStammFahrzeugeHandler,
    private readonly getByIdHandler: GetStammFahrzeugByIdHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle Stamm-Fahrzeuge auflisten (mit optionalem Archive-Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller Fahrzeuge zur Verwaltung
   * - Filter ermöglicht es, nur aktive Fahrzeuge anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer Fahrzeuge)
   * - Fahrzeugtyp-Relation wird eager loaded (vermeidet N+1 Problem)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param includeArchived - Optional: Auch archivierte Fahrzeuge anzeigen (default: false)
   * @returns Array aller Stamm-Fahrzeuge (sortiert nach rufname)
   * @throws BadRequestException wenn includeArchived ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // AC7: GET 30/min (überschreibt Klassen-Level 20/min)
  @ApiOperation({ summary: 'Alle Stamm-Fahrzeuge auflisten' })
  @ApiWrappedResponse(StammFahrzeugDto, { isArray: true, description: 'Liste aller Stamm-Fahrzeuge' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Archivierte Fahrzeuge einschließen' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('includeArchived') includeArchived?: string): Promise<StammFahrzeugDto[]> {
    // Parse boolean manually (undefined, 'true', 'false')
    // Validate: Only 'true', 'false', or undefined are allowed
    let parsedIncludeArchived: boolean | undefined;

    if (includeArchived !== undefined) {
      if (includeArchived === 'true') {
        parsedIncludeArchived = true;
      } else if (includeArchived === 'false') {
        parsedIncludeArchived = false;
      } else {
        // Invalid value provided
        // SECURITY: User-Input NICHT zurück an Client senden (XSS/Injection Prevention)
        this.logger.warn(`Invalid includeArchived value received: '${includeArchived}'`);
        throw new BadRequestException("Ungültiger Wert für 'includeArchived'. Erlaubte Werte: 'true', 'false' oder Parameter weglassen.");
      }
    }

    const query = new GetAllStammFahrzeugeQuery(parsedIncludeArchived);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      // WARUM String-Matching statt Error-Code-Check:
      // - Result Pattern gibt nur generische Fehlermeldungen zurück (kein Error-Code-System)
      // - Diese Query hat keine spezifischen Error-Codes definiert (nur generische Messages)
      // - String-Matching ist hier der einzige Weg, um Business-Errors von Infrastruktur-Errors zu unterscheiden
      // - Alternative wäre Domain-Error-Codes wie in Create/Update/Archive Handlers
      //
      // Business validation errors → 400 Bad Request
      // All other errors → 500 Internal Server Error
      //
      // SECURITY: result.error wird NICHT direkt an Client weitergegeben (Information Disclosure Risk)
      // Stattdessen: Generische Fehlermeldung für Client, Details nur in Server-Logs
      if (result.error?.includes('Validierung') || result.error?.includes('Ungültig')) {
        this.logger.warn(`Validation error in findAll: ${result.error}`);
        throw new BadRequestException('Ungültige Filterparameter');
      }
      this.logger.error(`Unexpected error in findAll: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der Stamm-Fahrzeuge');
    }

    return result.value ?? [];
  }

  /**
   * Stamm-Fahrzeug nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für ein spezifisches Fahrzeug
   * - Wird benötigt, um Fahrzeug-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz eines Fahrzeugs, bevor es bearbeitet wird
   * - Fahrzeugtyp-Relation wird eager loaded
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID des Stamm-Fahrzeugs (validiert mit ParseCuidPipe)
   * @returns Die Stamm-Fahrzeug-Details
   * @throws NotFoundException wenn Stamm-Fahrzeug nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // AC7: GET 30/min (überschreibt Klassen-Level 20/min)
  @ApiOperation({ summary: 'Stamm-Fahrzeug nach ID abrufen' })
  @ApiWrappedResponse(StammFahrzeugDto, { description: 'Stamm-Fahrzeug gefunden' })
  @ApiNotFoundResponse({ description: 'Stamm-Fahrzeug nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<StammFahrzeugDto> {
    const query = new GetStammFahrzeugByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      // SECURITY: Interne Fehlermeldungen nicht an Client leaken (Information Disclosure)
      this.logger.error(`Unexpected error in findOne for ID ${id}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen des Stamm-Fahrzeugs');
    }

    if (!result.value) {
      throw new NotFoundException(`Stamm-Fahrzeug mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neues Stamm-Fahrzeug erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue Fahrzeuge im System anzulegen (z.B. "RTW 1")
   * - Jedes Fahrzeug muss einen eindeutigen Funkrufnamen haben (z.B. "Rotkreuz 83/1"), um Duplikate zu verhindern
   * - Fahrzeugtyp muss bereits existieren (FK-Validierung)
   * - Neue Fahrzeuge sind standardmäßig NICHT archiviert
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Stamm-Fahrzeug-Daten (rufname, funkrufname, fahrzeugtypId, kennzeichen?, baujahr?, funkkenungBOS?)
   * @returns Das neu erstellte Stamm-Fahrzeug
   * @throws BadRequestException bei Validierungsfehlern oder nicht-existentem Fahrzeugtyp
   * @throws ConflictException wenn Funkrufname bereits vergeben ist
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neues Stamm-Fahrzeug erstellen' })
  @ApiWrappedCreatedResponse(StammFahrzeugDto, { description: 'Stamm-Fahrzeug erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Rufname zu kurz, Fahrzeugtyp existiert nicht)' })
  @ApiConflictResponse({ description: 'Funkrufname bereits vergeben' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateStammFahrzeugDto): Promise<StammFahrzeugDto> {
    // Create Command
    const commandResult = CreateStammFahrzeugCommand.create({
      rufname: dto.rufname,
      funkrufname: dto.funkrufname,
      fahrzeugtypId: dto.fahrzeugtypId,
      kennzeichen: dto.kennzeichen,
      baujahr: dto.baujahr,
      funkkenungBOS: dto.funkkenungBOS,
      createdBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.createHandler.execute(command);

    if (result.isFailure) {
      // Check error code instead of string matching
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE)) {
        throw new ConflictException(StammFahrzeugError.extractMessage(result.error));
      }
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.INVALID_FAHRZEUGTYP)) {
        throw new BadRequestException(StammFahrzeugError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created Stamm-Fahrzeug DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen des Stamm-Fahrzeugs');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Fahrzeug erstellt: ${result.value.id} (${result.value.rufname}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Stamm-Fahrzeug aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende Fahrzeuge zu bearbeiten (z.B. Tippfehler korrigieren)
   * - Kann Rufname, Funkrufname, Kennzeichen, Baujahr, Funkkennung ändern
   * - IMMUTABLE: fahrzeugtypId kann NICHT geändert werden (bei Umrüstung: archivieren + neu anlegen)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   *
   * @param id - CUID des Stamm-Fahrzeugs (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update, alle Felder optional)
   * @returns Das aktualisierte Stamm-Fahrzeug
   * @throws NotFoundException wenn Stamm-Fahrzeug nicht existiert
   * @throws ConflictException wenn neuer Funkrufname bereits vergeben ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Stamm-Fahrzeug aktualisieren' })
  @ApiWrappedResponse(StammFahrzeugDto, { description: 'Stamm-Fahrzeug erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Stamm-Fahrzeug nicht gefunden' })
  @ApiConflictResponse({ description: 'Neuer Funkrufname bereits vergeben' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateStammFahrzeugDto): Promise<StammFahrzeugDto> {
    // Create Command
    const commandResult = UpdateStammFahrzeugCommand.create({
      id,
      updatedBy: user.userId,
      rufname: dto.rufname,
      funkrufname: dto.funkrufname,
      kennzeichen: dto.kennzeichen,
      baujahr: dto.baujahr,
      funkkenungBOS: dto.funkkenungBOS,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.updateHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(StammFahrzeugError.extractMessage(result.error));
      }
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE)) {
        throw new ConflictException(StammFahrzeugError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated Stamm-Fahrzeug DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren des Stamm-Fahrzeugs');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Fahrzeug aktualisiert: ${result.value.id} (${result.value.rufname}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Stamm-Fahrzeug archivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - Stamm-Fahrzeuge werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Archivierte Fahrzeuge sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welches Fahrzeug war bei welchem Einsatz)
   * - Kann nicht reaktiviert werden (bei Fehler: neues Fahrzeug anlegen)
   * - Audit Trail: Speichert wer wann archiviert hat
   *
   * @param id - CUID des Stamm-Fahrzeugs (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Das archivierte Stamm-Fahrzeug
   * @throws NotFoundException wenn Stamm-Fahrzeug nicht existiert
   * @throws BadRequestException wenn bereits archiviert
   */
  @Patch(':id/archive')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Stamm-Fahrzeug archivieren' })
  @ApiWrappedResponse(StammFahrzeugDto, { description: 'Stamm-Fahrzeug erfolgreich archiviert' })
  @ApiBadRequestResponse({ description: 'Stamm-Fahrzeug ist bereits archiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Stamm-Fahrzeug nicht gefunden' })
  async archive(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<StammFahrzeugDto> {
    // Create Command
    const commandResult = ArchiveStammFahrzeugCommand.create({
      id,
      archivedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.archiveHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(StammFahrzeugError.extractMessage(result.error));
      }
      if (result.error && StammFahrzeugError.hasCode(result.error, STAMM_FAHRZEUG_ERROR_CODES.ALREADY_ARCHIVED)) {
        throw new ConflictException(StammFahrzeugError.extractMessage(result.error)); // AC8: 409 Conflict (Zustandskonflikt)
      }
      throw new BadRequestException(result.error);
    }

    // Return archived Stamm-Fahrzeug DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Archivieren des Stamm-Fahrzeugs');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Fahrzeug archiviert: ${result.value.id} (${result.value.rufname}) von Admin ${user.userId}`);

    return result.value;
  }
}
