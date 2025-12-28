import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';
import { LOGGER, KRAEFTE_REPOSITORIES } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

// Handlers (Hexagonal Architecture: Controller -> Handler -> Repository)
import { BesetzeRolleHandler } from '@application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.handler';
import { GebeRolleFreiHandler } from '@application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.handler';
import { FindAllRollenBesetzungQueryHandler } from '@application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.handler';

// Commands & Queries
import { BesetzeRolleCommand } from '@application/kraefte/rollen-besetzung/commands/besetze-rolle/besetze-rolle.command';
import { GebeRolleFreiCommand } from '@application/kraefte/rollen-besetzung/commands/gebe-rolle-frei/gebe-rolle-frei.command';
import { FindAllRollenBesetzungQuery } from '@application/kraefte/rollen-besetzung/queries/find-all-rollen-besetzung/find-all-rollen-besetzung.query';

// DTOs
import { BesetzeRolleDto, RollenBesetzungDto, RollenBesetzungListItemDto, RolleFreigegebenResponseDto } from '@application/kraefte/rollen-besetzung/dto';

// Error Codes
import { ROLLEN_BESETZUNG_ERROR_CODES } from '@domain/kraefte/common/rollen-besetzung-error-codes';

// Repositories (nur für POST Response Loading - wird später auch zu Query Handler migriert)
import type { IRollenBesetzungRepository } from '@domain/kraefte/repositories/i-rollen-besetzung.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';

/**
 * Controller für Rollenbesetzungs-Verwaltung im Einsatz-Kontext.
 *
 * Ermöglicht das Besetzen von Führungsrollen (LNA, OrgL, Leiter BHP) mit qualifizierten Personen.
 * Alle Endpoints sind mit JwtAuthGuard geschützt.
 *
 * **Story Context:**
 * Story 5.1 (Rolle besetzen mit Qualifikationsvalidierung) - API Layer
 *
 * **AC1 - Qualifikationsprüfung:**
 * Person muss alle Pflicht-Qualifikationen der Rolle besitzen.
 *
 * **AC2 - Duplikat-Prüfung:**
 * Eine Rolle kann pro Einsatz nur EINMAL besetzt werden (UNIQUE Constraint).
 *
 * **AC3 - Snapshot-Speicherung:**
 * Rollenname und Personenname werden bei Besetzung als Snapshot gespeichert.
 *
 * **AC4 - Automatische Freigabe:**
 * Bei Neu-Besetzung wird vorherige Person automatisch freigegeben.
 */
@ApiTags('rollen-besetzung')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/rollen-besetzung', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class RollenBesetzungController {
  constructor(
    private readonly besetzeRolleHandler: BesetzeRolleHandler,
    private readonly gebeRolleFreiHandler: GebeRolleFreiHandler,
    private readonly findAllQueryHandler: FindAllRollenBesetzungQueryHandler,
    @Inject(KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG)
    private readonly rollenBesetzungRepository: IRollenBesetzungRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle Rollenbesetzungen eines Einsatzes auflisten.
   *
   * Gibt alle besetzten Führungsrollen des Einsatzes zurück.
   * Sortiert nach Erstellungszeitpunkt (älteste zuerst).
   *
   * @param einsatzId - CUID des Einsatzes
   * @returns Array aller Rollenbesetzungen des Einsatzes
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Alle Rollenbesetzungen eines Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(RollenBesetzungListItemDto, { isArray: true, description: 'Liste aller Rollenbesetzungen' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findAll(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<RollenBesetzungListItemDto[]> {
    // Hexagonal Architecture: Controller -> Query Handler -> Repository
    const queryResult = FindAllRollenBesetzungQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Query konnte nicht erstellt werden');
    }

    const result = await this.findAllQueryHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Unexpected error in findAll for Einsatz ${einsatzId}: ${result.error}`, 'RollenBesetzungController');
      throw new InternalServerErrorException('Fehler beim Abrufen der Rollenbesetzungen');
    }

    return result.value ?? [];
  }

  /**
   * Rolle besetzen (Person zuweisen).
   *
   * **AC1 - Qualifikationsprüfung:**
   * Person muss alle Pflicht-Qualifikationen der Rolle besitzen.
   *
   * **AC2 - Duplikat-Prüfung:**
   * UNIQUE Constraint verhindert doppelte Besetzung.
   *
   * **AC3 - Snapshot-Speicherung:**
   * Rollenname und Personenname werden als Snapshot gespeichert.
   *
   * **AC4 - Automatische Freigabe:**
   * Bei Neu-Besetzung wird vorherige Person automatisch freigegeben.
   *
   * @param einsatzId - CUID des Einsatzes
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - BesetzeRolleDto mit einsatzPersonId und rollenDefinitionId
   * @returns Die neu erstellte RollenBesetzung
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rolle besetzen (Person zuweisen)' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedCreatedResponse(RollenBesetzungDto, { description: 'Rolle erfolgreich besetzt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Person nicht qualifiziert' })
  @ApiNotFoundResponse({ description: 'Person oder Rolle nicht gefunden' })
  @ApiConflictResponse({ description: 'Rolle bereits besetzt (ohne automatische Freigabe)' })
  async besetzeRolle(@Param('einsatzId', ParseCuidPipe) einsatzId: string, @CurrentUser() user: ValidatedUser, @Body() dto: BesetzeRolleDto): Promise<RollenBesetzungDto> {
    // Create Command
    const commandResult = BesetzeRolleCommand.create({
      einsatzId,
      einsatzPersonId: dto.einsatzPersonId,
      rollenDefinitionId: dto.rollenDefinitionId,
      besetztVon: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.besetzeRolleHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Map error codes to HTTP responses
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_ALREADY_BESETZT) {
        throw new ConflictException('Rolle bereits besetzt');
      }
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_FOUND) {
        throw new NotFoundException('EinsatzPerson nicht gefunden');
      }
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLE_NOT_FOUND) {
        throw new NotFoundException('RollenDefinition nicht gefunden');
      }
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.PERSON_NOT_QUALIFIED) {
        throw new BadRequestException('Person besitzt nicht alle erforderlichen Qualifikationen für diese Rolle');
      }
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.INVALID_EINSATZ_CONTEXT) {
        throw new BadRequestException('Rollenbesetzung für diesen Einsatz nicht möglich');
      }

      // Generic error
      this.logger.error(`Unexpected error in besetzeRolle: ${error}`, 'RollenBesetzungController');
      throw new InternalServerErrorException('Fehler beim Besetzen der Rolle');
    }

    const rollenBesetzungId = result.value;
    if (!rollenBesetzungId) {
      throw new InternalServerErrorException('Fehler beim Besetzen der Rolle');
    }

    // Load created besetzung for response
    const einsatzIdResult = EinsatzId.create(einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      throw new InternalServerErrorException('Fehler beim Laden der erstellten Besetzung');
    }

    const besetzungenResult = await this.rollenBesetzungRepository.findByEinsatzId(einsatzIdResult.value);
    if (besetzungenResult.isFailure) {
      throw new InternalServerErrorException('Fehler beim Laden der erstellten Besetzung');
    }

    const createdBesetzung = besetzungenResult.value?.find((b) => b.id.value === rollenBesetzungId);
    if (!createdBesetzung) {
      throw new InternalServerErrorException('Erstellte Besetzung nicht gefunden');
    }

    this.logger.log(
      `Rolle besetzt: ${createdBesetzung.rollenName} durch ${createdBesetzung.personVorname} ${createdBesetzung.personNachname} (Einsatz: ${einsatzId}, User: ${user.userId})`,
      'RollenBesetzungController',
    );

    return {
      id: createdBesetzung.id.value,
      einsatzId: createdBesetzung.einsatzId.value,
      einsatzPersonId: createdBesetzung.einsatzPersonId.value,
      rollenDefinitionId: createdBesetzung.rolleId.value,
      rollenName: createdBesetzung.rollenName,
      personVorname: createdBesetzung.personVorname,
      personNachname: createdBesetzung.personNachname,
      createdAt: createdBesetzung.createdAt?.toISOString() ?? new Date().toISOString(),
      createdBy: createdBesetzung.createdBy,
    };
  }

  /**
   * Rolle freigeben (Person entfernen).
   *
   * Setzt die Besetzung einer Rolle frei (Soft-Delete), sodass die Rolle
   * wieder besetzt werden kann. Die Person ist danach wieder als reguläre
   * Einsatzkraft verfügbar. Erzeugt automatisch einen ETB-Eintrag.
   *
   * **AC1:** Freigabe setzt freigegebenAm, emittiert RolleFreigegeben Event
   * **AC3:** Idempotenz - Doppelte Freigabe gibt 400 Bad Request
   * **AC4:** Freigegebene Rolle erscheint nicht mehr in aktiver Übersicht
   * **AC7:** HTTP 200 mit @ApiWrappedResponse für API-Konsistenz
   *
   * @param einsatzId - CUID des Einsatzes (für Routing-Konsistenz)
   * @param rollenBesetzungId - CUID der RollenBesetzung
   * @param user - Aktueller User (aus JWT Token)
   * @returns RolleFreigegebenResponseDto mit Bestätigung
   */
  @Delete(':rollenBesetzungId')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rolle freigeben (Person entfernen)' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'rollenBesetzungId', type: String, format: 'cuid', description: 'RollenBesetzung-ID (CUID)' })
  @ApiWrappedResponse(RolleFreigegebenResponseDto, { description: 'Rolle erfolgreich freigegeben' })
  @ApiBadRequestResponse({ description: 'Rolle bereits freigegeben oder ungültige ID' })
  @ApiNotFoundResponse({ description: 'Rollenbesetzung nicht gefunden' })
  async freigebenRolle(
    @Param('einsatzId', ParseCuidPipe) _einsatzId: string,
    @Param('rollenBesetzungId', ParseCuidPipe) rollenBesetzungId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<RolleFreigegebenResponseDto> {
    // Create Command
    const commandResult = GebeRolleFreiCommand.create({
      rollenBesetzungId,
      freigegebenVon: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute Command
    const result = await this.gebeRolleFreiHandler.execute(command);

    if (result.isFailure) {
      const error = result.error ?? '';

      // Map error codes to HTTP responses
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.ROLLEN_BESETZUNG_NOT_FOUND) {
        throw new NotFoundException('RollenBesetzung nicht gefunden');
      }
      if (error === ROLLEN_BESETZUNG_ERROR_CODES.BEREITS_FREIGEGEBEN) {
        throw new BadRequestException('Rolle wurde bereits freigegeben');
      }

      // Generic error
      this.logger.error(`Unexpected error in freigebenRolle: ${error}`, 'RollenBesetzungController');
      throw new InternalServerErrorException('Fehler beim Freigeben der Rolle');
    }

    this.logger.log(`Rolle freigegeben: ${rollenBesetzungId} (User: ${user.userId})`, 'RollenBesetzungController');

    return {
      id: rollenBesetzungId,
      message: 'Rolle erfolgreich freigegeben',
    };
  }
}
