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
import { CreateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/create-qualifikation/create-qualifikation.handler';
import { UpdateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/update-qualifikation/update-qualifikation.handler';
import { DeactivateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/deactivate-qualifikation/deactivate-qualifikation.handler';
import { GetAllQualifikationenHandler } from '@application/kraefte/qualifikationen/queries/get-all-qualifikationen/get-all-qualifikationen.handler';
import { GetQualifikationByIdHandler } from '@application/kraefte/qualifikationen/queries/get-qualifikation-by-id/get-qualifikation-by-id.handler';

// Commands & Queries
import { CreateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/create-qualifikation/create-qualifikation.command';
import { UpdateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/update-qualifikation/update-qualifikation.command';
import { DeactivateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/deactivate-qualifikation/deactivate-qualifikation.command';
import { GetAllQualifikationenQuery } from '@application/kraefte/qualifikationen/queries/get-all-qualifikationen/get-all-qualifikationen.query';
import { GetQualifikationByIdQuery } from '@application/kraefte/qualifikationen/queries/get-qualifikation-by-id/get-qualifikation-by-id.query';

// DTOs
import { QualifikationDto } from '@application/kraefte/qualifikationen/dto/qualifikation.dto';
import { CreateQualifikationDto } from '@application/kraefte/qualifikationen/dto/create-qualifikation.dto';
import { UpdateQualifikationDto } from '@application/kraefte/qualifikationen/dto/update-qualifikation.dto';

// Error Codes
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';

/**
 * Admin Controller für Qualifikationen-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können Qualifikationen verwalten.
 *
 * **Authorization Design:**
 * - WARUM keine createdBy/updatedBy Prüfung gegen aktuellen User:
 *   - Admin darf ALLE Qualifikationen verwalten (unabhängig davon, wer sie erstellt hat)
 *   - createdBy/updatedBy sind NUR für Audit-Trail (Nachvollziehbarkeit)
 *   - Keine Ownership-basierte Autorisierung auf Qualifikations-Ebene
 *   - Qualifikationen sind globale Stammdaten (keine User-spezifischen Ressourcen)
 *   - AdminJwtAuthGuard stellt sicher, dass nur Admins überhaupt Zugriff haben
 *
 * Rate Limiting (Controller-Level):
 * - Max. 20 Anfragen pro Minute pro IP (verhindert DoS-Angriffe auf Admin-Endpoints)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-kraefte-qualifikationen')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/kraefte/qualifikationen', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminQualifikationenController {
  constructor(
    private readonly createHandler: CreateQualifikationHandler,
    private readonly updateHandler: UpdateQualifikationHandler,
    private readonly deactivateHandler: DeactivateQualifikationHandler,
    private readonly getAllHandler: GetAllQualifikationenHandler,
    private readonly getByIdHandler: GetQualifikationByIdHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle Qualifikationen auflisten (mit optionalem Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller Qualifikationen zur Verwaltung
   * - Filter ermöglicht es, nur aktive Qualifikationen anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer Qualifikationen)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param istAktiv - Optional: Nur aktive (true) oder inaktive (false) Qualifikationen
   * @returns Array aller Qualifikationen (sortiert nach Name)
   * @throws BadRequestException wenn istAktiv ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @ApiOperation({ summary: 'Alle Qualifikationen auflisten' })
  @ApiWrappedResponse(QualifikationDto, { isArray: true, description: 'Liste aller Qualifikationen' })
  @ApiQuery({ name: 'istAktiv', required: false, type: Boolean, description: 'Filter nach Aktivierungsstatus' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('istAktiv') istAktiv?: string): Promise<QualifikationDto[]> {
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

    const query = new GetAllQualifikationenQuery(parsedIstAktiv);
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
      throw new InternalServerErrorException('Fehler beim Abrufen der Qualifikationen');
    }

    return result.value ?? [];
  }

  /**
   * Qualifikation nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für eine spezifische Qualifikation
   * - Wird benötigt, um Qualifikations-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz einer Qualifikation, bevor sie bearbeitet wird
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @returns Die Qualifikation-Details
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @ApiOperation({ summary: 'Qualifikation nach ID abrufen' })
  @ApiWrappedResponse(QualifikationDto, { description: 'Qualifikation gefunden' })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<QualifikationDto> {
    const query = new GetQualifikationByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      // SECURITY: Interne Fehlermeldungen nicht an Client leaken (Information Disclosure)
      this.logger.error(`Unexpected error in findOne for ID ${id}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der Qualifikation');
    }

    if (!result.value) {
      throw new NotFoundException(`Qualifikation mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neue Qualifikation erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue Qualifikationen im System anzulegen (z.B. "Atemschutzgeräteträger")
   * - Jede Qualifikation muss eine eindeutige Abkürzung haben (z.B. "AGT"), um Duplikate zu verhindern
   * - Neue Qualifikationen sind standardmäßig aktiv und können Kräften zugeordnet werden
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Qualifikations-Daten (Name, Abkürzung, Kategorie, Beschreibung)
   * @returns Die neu erstellte Qualifikation
   * @throws BadRequestException bei Validierungsfehlern
   * @throws ConflictException wenn Abkürzung bereits vergeben ist
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neue Qualifikation erstellen' })
  @ApiWrappedCreatedResponse(QualifikationDto, { description: 'Qualifikation erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Name zu kurz)' })
  @ApiConflictResponse({ description: 'Abkürzung bereits vergeben' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateQualifikationDto): Promise<QualifikationDto> {
    // Create Command
    const commandResult = CreateQualifikationCommand.create({
      name: dto.name,
      abkuerzung: dto.abkuerzung,
      kategorie: dto.kategorie,
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
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE)) {
        throw new ConflictException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation erstellt: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Qualifikation aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende Qualifikationen zu bearbeiten (z.B. Tippfehler korrigieren)
   * - Kann Abkürzung ändern (mit Unique-Check, um Duplikate zu verhindern)
   * - Kann Aktivierungsstatus ändern (Alternative zu Deactivate-Endpoint)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update)
   * @returns Die aktualisierte Qualifikation
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws ConflictException wenn neue Abkürzung bereits vergeben ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Qualifikation aktualisieren' })
  @ApiWrappedResponse(QualifikationDto, { description: 'Qualifikation erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  @ApiConflictResponse({ description: 'Neue Abkürzung bereits vergeben' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateQualifikationDto): Promise<QualifikationDto> {
    // Create Command
    const commandResult = UpdateQualifikationCommand.create({
      id,
      updatedBy: user.userId,
      name: dto.name,
      abkuerzung: dto.abkuerzung,
      kategorie: dto.kategorie,
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
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(QualifikationError.extractMessage(result.error));
      }
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE)) {
        throw new ConflictException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation aktualisiert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Qualifikation deaktivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - Qualifikationen werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Deaktivierte Qualifikationen sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welche Kraft hatte welche Qualifikation)
   * - Kann reaktiviert werden über den Update-Endpoint (istAktiv: true)
   * - Audit Trail: Speichert wer wann deaktiviert hat
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Die deaktivierte Qualifikation
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws BadRequestException wenn bereits deaktiviert
   */
  @Patch(':id/deactivate')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Qualifikation deaktivieren' })
  @ApiWrappedResponse(QualifikationDto, { description: 'Qualifikation erfolgreich deaktiviert' })
  @ApiBadRequestResponse({ description: 'Qualifikation ist bereits deaktiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  async deactivate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<QualifikationDto> {
    // Create Command
    const commandResult = DeactivateQualifikationCommand.create({
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
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(QualifikationError.extractMessage(result.error));
      }
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ALREADY_DEACTIVATED)) {
        throw new BadRequestException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return deactivated Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Deaktivieren der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation deaktiviert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }
}
