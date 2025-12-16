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
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { CreateRollenDefinitionHandler } from '@application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.handler';
import { UpdateRollenDefinitionHandler } from '@application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.handler';
import { DeactivateRollenDefinitionHandler } from '@application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.handler';
import { GetAllRollenDefinitionenQueryHandler } from '@application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.handler';
import { GetRollenDefinitionByIdQueryHandler } from '@application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.handler';

// Commands & Queries
import { CreateRollenDefinitionCommand } from '@application/kraefte/rollen/commands/create-rollen-definition/create-rollen-definition.command';
import { UpdateRollenDefinitionCommand } from '@application/kraefte/rollen/commands/update-rollen-definition/update-rollen-definition.command';
import { DeactivateRollenDefinitionCommand } from '@application/kraefte/rollen/commands/deactivate-rollen-definition/deactivate-rollen-definition.command';
import { GetAllRollenDefinitionenQuery } from '@application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.query';
import { GetRollenDefinitionByIdQuery } from '@application/kraefte/rollen/queries/get-rollen-definition-by-id/get-rollen-definition-by-id.query';

// DTOs
import { RollenDefinitionDto } from '@application/kraefte/rollen/dto/rollen-definition.dto';
import { CreateRollenDefinitionDto } from '@application/kraefte/rollen/dto/create-rollen-definition.dto';
import { UpdateRollenDefinitionDto } from '@application/kraefte/rollen/dto/update-rollen-definition.dto';

// Error Codes
import { ROLLE_ERROR_CODES, RolleError } from '@domain/kraefte/common/rolle-error-codes';

/**
 * Admin Controller für RollenDefinitionen-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können RollenDefinitionen verwalten.
 *
 * **Authorization Design:**
 * - WARUM keine createdBy/updatedBy Prüfung gegen aktuellen User:
 *   - Admin darf ALLE RollenDefinitionen verwalten (unabhängig davon, wer sie erstellt hat)
 *   - createdBy/updatedBy sind NUR für Audit-Trail (Nachvollziehbarkeit)
 *   - Keine Ownership-basierte Autorisierung auf RollenDefinition-Ebene
 *   - RollenDefinitionen sind globale Stammdaten (keine User-spezifischen Ressourcen)
 *   - AdminJwtAuthGuard stellt sicher, dass nur Admins überhaupt Zugriff haben
 *
 * Rate Limiting (Controller-Level):
 * - Max. 20 Anfragen pro Minute pro IP (verhindert DoS-Angriffe auf Admin-Endpoints)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-kraefte-rollen')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/kraefte/rollen', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminRollenController {
  private readonly logger = new Logger(AdminRollenController.name);

  constructor(
    private readonly createHandler: CreateRollenDefinitionHandler,
    private readonly updateHandler: UpdateRollenDefinitionHandler,
    private readonly deactivateHandler: DeactivateRollenDefinitionHandler,
    private readonly getAllHandler: GetAllRollenDefinitionenQueryHandler,
    private readonly getByIdHandler: GetRollenDefinitionByIdQueryHandler,
  ) {}

  /**
   * Alle RollenDefinitionen auflisten (mit optionalem Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller RollenDefinitionen zur Verwaltung
   * - Filter ermöglicht es, nur aktive RollenDefinitionen anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer RollenDefinitionen)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param istAktiv - Optional: Nur aktive (true) oder inaktive (false) RollenDefinitionen
   * @returns Array aller RollenDefinitionen (sortiert nach sortOrder, dann Name)
   * @throws BadRequestException wenn istAktiv ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @ApiOperation({ summary: 'Alle RollenDefinitionen auflisten' })
  @ApiOkResponse({ type: RollenDefinitionDto, isArray: true })
  @ApiQuery({ name: 'istAktiv', required: false, type: Boolean, description: 'Filter nach Aktivierungsstatus' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('istAktiv') istAktiv?: string): Promise<RollenDefinitionDto[]> {
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

    const query = new GetAllRollenDefinitionenQuery(parsedIstAktiv !== undefined ? { istAktiv: parsedIstAktiv } : undefined);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      // WARUM kein Error-Code-Check:
      // - GetAllRollenDefinitionenQuery wirft keine Business-Validierungsfehler
      // - Nur Repository/Infrastruktur-Fehler möglich (z.B. DB Connection Errors)
      // - Alle Fehler hier sind unerwartete Infrastruktur-Fehler → 500 Internal Server Error
      //
      // SECURITY: result.error wird NICHT direkt an Client weitergegeben (Information Disclosure Risk)
      // Stattdessen: Generische Fehlermeldung für Client, Details nur in Server-Logs
      this.logger.error(`Unexpected error in findAll: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der RollenDefinitionen');
    }

    return result.value ?? [];
  }

  /**
   * RollenDefinition nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für eine spezifische RollenDefinition
   * - Wird benötigt, um RollenDefinition-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz einer RollenDefinition, bevor sie bearbeitet wird
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID der RollenDefinition (validiert mit ParseCuidPipe)
   * @returns Die RollenDefinition-Details
   * @throws NotFoundException wenn RollenDefinition nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @ApiOperation({ summary: 'RollenDefinition nach ID abrufen' })
  @ApiOkResponse({ type: RollenDefinitionDto })
  @ApiNotFoundResponse({ description: 'RollenDefinition nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<RollenDefinitionDto> {
    const query = new GetRollenDefinitionByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      // SECURITY: Interne Fehlermeldungen nicht an Client leaken (Information Disclosure)
      this.logger.error(`Unexpected error in findOne for ID ${id}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der RollenDefinition');
    }

    if (!result.value) {
      throw new NotFoundException(`RollenDefinition mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neue RollenDefinition erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue RollenDefinitionen im System anzulegen (z.B. "Einsatzleiter")
   * - Jede RollenDefinition muss einen eindeutigen Namen haben (z.B. "Einsatzleiter"), um Duplikate zu verhindern
   * - Neue RollenDefinitionen sind standardmäßig aktiv und können Kräften zugeordnet werden
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   * - M:N Relation: Verknüpft RollenDefinition mit erforderlichen Qualifikationen
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - RollenDefinition-Daten (Name, Funkrufname, Beschreibung, qualifikationIds)
   * @returns Die neu erstellte RollenDefinition mit erforderlicheQualifikationen
   * @throws BadRequestException bei Validierungsfehlern oder ungültigen qualifikationIds
   * @throws ConflictException wenn Name bereits vergeben ist
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neue RollenDefinition erstellen' })
  @ApiCreatedResponse({ type: RollenDefinitionDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Name zu kurz) oder Qualifikation nicht gefunden' })
  @ApiConflictResponse({ description: 'Name bereits vergeben' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateRollenDefinitionDto): Promise<RollenDefinitionDto> {
    // Create Command
    // Map qualifikationIds from DTO to erforderlicheQualifikationen format (all with istPflicht: true)
    const commandResult = CreateRollenDefinitionCommand.create({
      name: dto.name,
      funkrufname: dto.funkrufname,
      beschreibung: dto.beschreibung,
      erforderlicheQualifikationen: dto.qualifikationIds.map((qualifikationId) => ({
        qualifikationId,
        istPflicht: true, // Default: alle Qualifikationen sind Pflicht
      })),
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
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.NAME_DUPLICATE)) {
        throw new ConflictException(RolleError.extractMessage(result.error));
      }
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.QUALIFIKATION_NOT_FOUND)) {
        throw new BadRequestException(RolleError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created RollenDefinition DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen der RollenDefinition');
    }

    // Audit logging for mutation
    this.logger.log(`RollenDefinition erstellt: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * RollenDefinition aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende RollenDefinitionen zu bearbeiten (z.B. Tippfehler korrigieren)
   * - Kann Name ändern (mit Unique-Check, um Duplikate zu verhindern)
   * - Kann Aktivierungsstatus ändern (Alternative zu Deactivate-Endpoint)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   * - M:N Relation: Bei qualifikationIds werden bestehende Verknüpfungen ERSETZT (nicht gemergt)
   *
   * @param id - CUID der RollenDefinition (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update)
   * @returns Die aktualisierte RollenDefinition
   * @throws NotFoundException wenn RollenDefinition nicht existiert
   * @throws ConflictException wenn neuer Name bereits vergeben ist
   * @throws BadRequestException bei Validierungsfehlern oder ungültigen qualifikationIds
   */
  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'RollenDefinition aktualisieren' })
  @ApiOkResponse({ type: RollenDefinitionDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler, ungültige CUID oder Qualifikation nicht gefunden' })
  @ApiNotFoundResponse({ description: 'RollenDefinition nicht gefunden' })
  @ApiConflictResponse({ description: 'Neuer Name bereits vergeben' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateRollenDefinitionDto): Promise<RollenDefinitionDto> {
    // Create Command
    // Map qualifikationIds from DTO to erforderlicheQualifikationen format (if provided)
    const commandResult = UpdateRollenDefinitionCommand.create({
      id,
      updatedBy: user.userId,
      name: dto.name,
      funkrufname: dto.funkrufname,
      beschreibung: dto.beschreibung,
      erforderlicheQualifikationen: dto.qualifikationIds?.map((qualifikationId) => ({
        qualifikationId,
        istPflicht: true, // Default: alle Qualifikationen sind Pflicht
      })),
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
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(RolleError.extractMessage(result.error));
      }
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.NAME_DUPLICATE)) {
        throw new ConflictException(RolleError.extractMessage(result.error));
      }
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.QUALIFIKATION_NOT_FOUND)) {
        throw new BadRequestException(RolleError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated RollenDefinition DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren der RollenDefinition');
    }

    // Audit logging for mutation
    this.logger.log(`RollenDefinition aktualisiert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * RollenDefinition deaktivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - RollenDefinitionen werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Deaktivierte RollenDefinitionen sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welche Kraft hatte welche Rolle)
   * - Kann reaktiviert werden über den Update-Endpoint (istAktiv: true)
   * - Audit Trail: Speichert wer wann deaktiviert hat
   * - RolleQualifikation Verknüpfungen bleiben erhalten (Audit-Trail)
   *
   * @param id - CUID der RollenDefinition (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Die deaktivierte RollenDefinition
   * @throws NotFoundException wenn RollenDefinition nicht existiert
   * @throws BadRequestException wenn bereits deaktiviert
   */
  @Patch(':id/deactivate')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'RollenDefinition deaktivieren' })
  @ApiOkResponse({ type: RollenDefinitionDto })
  @ApiBadRequestResponse({ description: 'RollenDefinition ist bereits deaktiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'RollenDefinition nicht gefunden' })
  async deactivate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<RollenDefinitionDto> {
    // Create Command
    const commandResult = DeactivateRollenDefinitionCommand.create({
      id,
      deactivatedBy: user.userId,
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
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(RolleError.extractMessage(result.error));
      }
      if (result.error && RolleError.hasCode(result.error, ROLLE_ERROR_CODES.ALREADY_DEACTIVATED)) {
        throw new BadRequestException(RolleError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return deactivated RollenDefinition DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Deaktivieren der RollenDefinition');
    }

    // Audit logging for mutation
    this.logger.log(`RollenDefinition deaktiviert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }
}
