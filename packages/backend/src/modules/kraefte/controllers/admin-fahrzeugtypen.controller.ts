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
  Logger,
} from '@nestjs/common';
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
  ApiQuery,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';

// Handlers
import { CreateFahrzeugtypHandler } from '@application/kraefte/fahrzeugtypen/commands/create-fahrzeugtyp/create-fahrzeugtyp.handler';
import { UpdateFahrzeugtypHandler } from '@application/kraefte/fahrzeugtypen/commands/update-fahrzeugtyp/update-fahrzeugtyp.handler';
import { DeactivateFahrzeugtypHandler } from '@application/kraefte/fahrzeugtypen/commands/deactivate-fahrzeugtyp/deactivate-fahrzeugtyp.handler';
import { GetAllFahrzeugtypenHandler } from '@application/kraefte/fahrzeugtypen/queries/get-all-fahrzeugtypen/get-all-fahrzeugtypen.handler';
import { GetFahrzeugtypByIdHandler } from '@application/kraefte/fahrzeugtypen/queries/get-fahrzeugtyp-by-id/get-fahrzeugtyp-by-id.handler';

// Commands & Queries
import { CreateFahrzeugtypCommand } from '@application/kraefte/fahrzeugtypen/commands/create-fahrzeugtyp/create-fahrzeugtyp.command';
import { UpdateFahrzeugtypCommand } from '@application/kraefte/fahrzeugtypen/commands/update-fahrzeugtyp/update-fahrzeugtyp.command';
import { DeactivateFahrzeugtypCommand } from '@application/kraefte/fahrzeugtypen/commands/deactivate-fahrzeugtyp/deactivate-fahrzeugtyp.command';
import { GetAllFahrzeugtypenQuery } from '@application/kraefte/fahrzeugtypen/queries/get-all-fahrzeugtypen/get-all-fahrzeugtypen.query';
import { GetFahrzeugtypByIdQuery } from '@application/kraefte/fahrzeugtypen/queries/get-fahrzeugtyp-by-id/get-fahrzeugtyp-by-id.query';

// DTOs
import { FahrzeugtypDto } from '@application/kraefte/fahrzeugtypen/dto/fahrzeugtyp.dto';
import { CreateFahrzeugtypDto } from '@application/kraefte/fahrzeugtypen/dto/create-fahrzeugtyp.dto';
import { UpdateFahrzeugtypDto } from '@application/kraefte/fahrzeugtypen/dto/update-fahrzeugtyp.dto';

// Error Codes
import { FAHRZEUGTYP_ERROR_CODES, FahrzeugtypError } from '@domain/kraefte/common/fahrzeugtyp-error-codes';

/**
 * Admin Controller für Fahrzeugtypen-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können Fahrzeugtypen verwalten.
 *
 * **Authorization Design:**
 * - WARUM keine createdBy/updatedBy Prüfung gegen aktuellen User:
 *   - Admin darf ALLE Fahrzeugtypen verwalten (unabhängig davon, wer sie erstellt hat)
 *   - createdBy/updatedBy sind NUR für Audit-Trail (Nachvollziehbarkeit)
 *   - Keine Ownership-basierte Autorisierung auf Fahrzeugtyp-Ebene
 *   - Fahrzeugtypen sind globale Stammdaten (keine User-spezifischen Ressourcen)
 *   - AdminJwtAuthGuard stellt sicher, dass nur Admins überhaupt Zugriff haben
 *
 * Rate Limiting (Controller-Level):
 * - Max. 20 Anfragen pro Minute pro IP (verhindert DoS-Angriffe auf Admin-Endpoints)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-kraefte-fahrzeugtypen')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/kraefte/fahrzeugtypen', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
export class AdminFahrzeugtypenController {
  private readonly logger = new Logger(AdminFahrzeugtypenController.name);

  constructor(
    private readonly createHandler: CreateFahrzeugtypHandler,
    private readonly updateHandler: UpdateFahrzeugtypHandler,
    private readonly deactivateHandler: DeactivateFahrzeugtypHandler,
    private readonly getAllHandler: GetAllFahrzeugtypenHandler,
    private readonly getByIdHandler: GetFahrzeugtypByIdHandler,
  ) {}

  /**
   * Alle Fahrzeugtypen auflisten (mit optionalem Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller Fahrzeugtypen zur Verwaltung
   * - Filter ermöglicht es, nur aktive Fahrzeugtypen anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer Fahrzeugtypen)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param istAktiv - Optional: Nur aktive (true) oder inaktive (false) Fahrzeugtypen
   * @returns Array aller Fahrzeugtypen (sortiert nach sortOrder)
   * @throws BadRequestException wenn istAktiv ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @ApiOperation({ summary: 'Alle Fahrzeugtypen auflisten' })
  @ApiOkResponse({ type: FahrzeugtypDto, isArray: true })
  @ApiQuery({ name: 'istAktiv', required: false, type: Boolean, description: 'Filter nach Aktivierungsstatus' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('istAktiv') istAktiv?: string): Promise<FahrzeugtypDto[]> {
    // Parse boolean manually (undefined, 'true', 'false')
    // Validate: Only 'true', 'false', or undefined are allowed
    let parsedIstAktiv: boolean | undefined;

    if (istAktiv !== undefined) {
      if (istAktiv === 'true') {
        parsedIstAktiv = true;
      } else if (istAktiv === 'false') {
        parsedIstAktiv = false;
      } else {
        // Invalid value provided
        // SECURITY: User-Input NICHT zurück an Client senden (XSS/Injection Prevention)
        this.logger.warn(`Invalid istAktiv value received: '${istAktiv}'`);
        throw new BadRequestException("Ungültiger Wert für 'istAktiv'. Erlaubte Werte: 'true', 'false' oder Parameter weglassen.");
      }
    }

    const query = new GetAllFahrzeugtypenQuery(parsedIstAktiv);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      // WARUM String-Matching statt Error-Code-Check:
      // - Result Pattern gibt nur generische Fehlermeldungen zurück (kein Error-Code-System)
      // - Diese Query hat keine spezifischen Error-Codes definiert (nur generische Messages)
      // - String-Matching ist hier der einzige Weg, um Business-Errors von Infrastruktur-Errors zu unterscheiden
      // - Alternative wäre Domain-Error-Codes wie in Create/Update/Deactivate Handlers
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
      throw new InternalServerErrorException('Fehler beim Abrufen der Fahrzeugtypen');
    }

    return result.value ?? [];
  }

  /**
   * Fahrzeugtyp nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für einen spezifischen Fahrzeugtyp
   * - Wird benötigt, um Fahrzeugtyp-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz eines Fahrzeugtyps, bevor er bearbeitet wird
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID des Fahrzeugtyps (validiert mit ParseCuidPipe)
   * @returns Die Fahrzeugtyp-Details
   * @throws NotFoundException wenn Fahrzeugtyp nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @ApiOperation({ summary: 'Fahrzeugtyp nach ID abrufen' })
  @ApiOkResponse({ type: FahrzeugtypDto })
  @ApiNotFoundResponse({ description: 'Fahrzeugtyp nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<FahrzeugtypDto> {
    const query = new GetFahrzeugtypByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      // SECURITY: Interne Fehlermeldungen nicht an Client leaken (Information Disclosure)
      this.logger.error(`Unexpected error in findOne for ID ${id}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen des Fahrzeugtyps');
    }

    if (!result.value) {
      throw new NotFoundException(`Fahrzeugtyp mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neuen Fahrzeugtyp erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue Fahrzeugtypen im System anzulegen (z.B. "RTW", "NEF")
   * - Jeder Fahrzeugtyp muss einen eindeutigen Code haben (z.B. "RTW"), um Duplikate zu verhindern
   * - Neue Fahrzeugtypen sind standardmäßig aktiv und können Fahrzeugen zugeordnet werden
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Fahrzeugtyp-Daten (Code, Bezeichnung, Kategorie, Sollbesatzung, Beschreibung)
   * @returns Der neu erstellte Fahrzeugtyp
   * @throws BadRequestException bei Validierungsfehlern
   * @throws ConflictException wenn Code bereits vergeben ist
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neuen Fahrzeugtyp erstellen' })
  @ApiCreatedResponse({ type: FahrzeugtypDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Code zu kurz)' })
  @ApiConflictResponse({ description: 'Code bereits vergeben' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateFahrzeugtypDto): Promise<FahrzeugtypDto> {
    // Create Command
    const commandResult = CreateFahrzeugtypCommand.create({
      code: dto.code,
      bezeichnung: dto.bezeichnung,
      kategorie: dto.kategorie,
      sollbesatzung: dto.sollbesatzung,
      beschreibung: dto.beschreibung,
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
      if (result.error && FahrzeugtypError.hasCode(result.error, FAHRZEUGTYP_ERROR_CODES.CODE_DUPLICATE)) {
        throw new ConflictException(FahrzeugtypError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created Fahrzeugtyp DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen des Fahrzeugtyps');
    }

    // Audit logging for mutation
    this.logger.log(`Fahrzeugtyp erstellt: ${result.value.id} (${result.value.code}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Fahrzeugtyp aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende Fahrzeugtypen zu bearbeiten (z.B. Tippfehler korrigieren)
   * - Kann Code ändern (mit Unique-Check, um Duplikate zu verhindern)
   * - Kann Aktivierungsstatus ändern (Alternative zu Deactivate-Endpoint)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   *
   * @param id - CUID des Fahrzeugtyps (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update)
   * @returns Der aktualisierte Fahrzeugtyp
   * @throws NotFoundException wenn Fahrzeugtyp nicht existiert
   * @throws ConflictException wenn neuer Code bereits vergeben ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Fahrzeugtyp aktualisieren' })
  @ApiOkResponse({ type: FahrzeugtypDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Fahrzeugtyp nicht gefunden' })
  @ApiConflictResponse({ description: 'Neuer Code bereits vergeben' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateFahrzeugtypDto): Promise<FahrzeugtypDto> {
    // Create Command
    const commandResult = UpdateFahrzeugtypCommand.create({
      id,
      updatedBy: user.userId,
      code: dto.code,
      bezeichnung: dto.bezeichnung,
      kategorie: dto.kategorie,
      sollbesatzung: dto.sollbesatzung,
      beschreibung: dto.beschreibung,
      istAktiv: dto.istAktiv,
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
      if (result.error && FahrzeugtypError.hasCode(result.error, FAHRZEUGTYP_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(FahrzeugtypError.extractMessage(result.error));
      }
      if (result.error && FahrzeugtypError.hasCode(result.error, FAHRZEUGTYP_ERROR_CODES.CODE_DUPLICATE)) {
        throw new ConflictException(FahrzeugtypError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated Fahrzeugtyp DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren des Fahrzeugtyps');
    }

    // Audit logging for mutation
    this.logger.log(`Fahrzeugtyp aktualisiert: ${result.value.id} (${result.value.code}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Fahrzeugtyp deaktivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - Fahrzeugtypen werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Deaktivierte Fahrzeugtypen sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welches Fahrzeug hatte welchen Typ)
   * - Kann reaktiviert werden über den Update-Endpoint (istAktiv: true)
   * - Audit Trail: Speichert wer wann deaktiviert hat
   *
   * @param id - CUID des Fahrzeugtyps (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Der deaktivierte Fahrzeugtyp
   * @throws NotFoundException wenn Fahrzeugtyp nicht existiert
   * @throws BadRequestException wenn bereits deaktiviert
   */
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Fahrzeugtyp deaktivieren' })
  @ApiOkResponse({ type: FahrzeugtypDto })
  @ApiBadRequestResponse({ description: 'Fahrzeugtyp ist bereits deaktiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Fahrzeugtyp nicht gefunden' })
  async deactivate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<FahrzeugtypDto> {
    // Create Command
    const commandResult = DeactivateFahrzeugtypCommand.create({
      id,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.deactivateHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && FahrzeugtypError.hasCode(result.error, FAHRZEUGTYP_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(FahrzeugtypError.extractMessage(result.error));
      }
      if (result.error && FahrzeugtypError.hasCode(result.error, FAHRZEUGTYP_ERROR_CODES.ALREADY_DEACTIVATED)) {
        throw new BadRequestException(FahrzeugtypError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return deactivated Fahrzeugtyp DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Deaktivieren des Fahrzeugtyps');
    }

    // Audit logging for mutation
    this.logger.log(`Fahrzeugtyp deaktiviert: ${result.value.id} (${result.value.code}) von Admin ${user.userId}`);

    return result.value;
  }
}
