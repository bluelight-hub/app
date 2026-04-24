import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateGefaehrdungsbeurteilungDto } from '@/application/eigenschutz/dto/create-gefaehrdungsbeurteilung.dto';
import { GefaehrdungsbeurteilungDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung.dto';
import { toGefaehrdungsbeurteilungDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung.factory';
import { GefaehrdungsbeurteilungHistorieDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.dto';
import { toHistorieDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung-historie.factory';
import { GefaehrdungsbeurteilungVorlageDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung-vorlage.dto';
import { toGefaehrdungsbeurteilungVorlageDto } from '@/application/eigenschutz/dto/gefaehrdungsbeurteilung-vorlage.factory';
import { UpdateGefaehrdungsbeurteilungItemsDto } from '@/application/eigenschutz/dto/gefaehrdung-item-input.dto';
import { CreateGefaehrdungsbeurteilungCommand } from '@/application/eigenschutz/commands/create-gefaehrdungsbeurteilung/create-gefaehrdungsbeurteilung.command';
import { UpdateGefaehrdungsbeurteilungItemsCommand } from '@/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.command';
import { UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES } from '@/application/eigenschutz/commands/update-gefaehrdungsbeurteilung-items/update-gefaehrdungsbeurteilung-items.handler';
import { GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/gefaehrdungsbeurteilung.aggregate';
import { GetGefaehrdungsbeurteilungQuery } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung/get-gefaehrdungsbeurteilung.query';
import { GetGefaehrdungsbeurteilungHistorieQuery } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.query';
import type { HistorieReadModel } from '@/application/eigenschutz/queries/get-gefaehrdungsbeurteilung-historie/get-gefaehrdungsbeurteilung-historie.handler';
import { ListGefaehrdungsbeurteilungsVorlagenQuery } from '@/application/eigenschutz/queries/list-gefaehrdungsbeurteilungs-vorlagen/list-gefaehrdungsbeurteilungs-vorlagen.query';
import type { GefaehrdungsbeurteilungReadModel } from '@domain/eigenschutz/repositories';
import type { GefaehrdungsbeurteilungVorlageReadModel } from '@domain/eigenschutz/repositories';
import { Result } from '@domain/common/result';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequiresEigenschutzRolle } from '@/modules/auth/decorators/requires-eigenschutz-rolle.decorator';
import { RequiresPermission } from '@/modules/auth/decorators/requires-permission.decorator';
import { EigenschutzRolleGuard } from '@/modules/auth/guards/eigenschutz-rolle.guard';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

/**
 * Controller für Gefährdungsbeurteilungs-Endpunkte (Story 415-2-1, Task 5).
 *
 * Routen sind konsequent einsatz-scoped unter
 * `/einsaetze/:einsatzId/sicherheit/eigenschutz/...` (Story-Vertrag + Memory-
 * Regel „Einsatz-bezogene HTTP-Endpoints immer unter /einsatz/:einsatzId/…").
 *
 * ### Guard-Kette (verbindlich, vier Guards)
 * ```
 * JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard → PermissionsGuard
 * ```
 * Die Reihenfolge ist bindend, weil `EigenschutzRolleGuard` und
 * `PermissionsGuard` beide auf `request.einsatzContext` zugreifen, das
 * ausschließlich der `EinsatzScopeGuard` setzt.
 *
 * ### Permission-Matrix
 * - `GET .../gefaehrdungsbeurteilungs-vorlagen`: Reader-Rollen + `…:read`.
 * - `POST .../gefaehrdungsbeurteilungen`: ausschließlich
 *   `Sicherheitsbeauftragter` + `…:write`.
 * - `GET .../gefaehrdungsbeurteilungen/:id`: Reader-Rollen + `…:read`.
 *
 * ### Error-Mapping (AC6)
 * Der Create-Handler liefert drei Sentinel-Codes
 * ({@link CREATE_GEFAEHRDUNGSBEURTEILUNG_ERROR_CODES}), die hier strukturiert
 * auf HTTP gemappt werden:
 * - `NotFound:<Resource>` → 404 mit `context.resource` (lowercase).
 * - `BusinessRule:<Rule>` → 422 mit `context.rule`.
 * - alles andere → 500 (Logging liegt am Handler).
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung (Einsatz-Scope, Eigenschutz-Rolle oder Permission fehlt)' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard)
export class GefaehrdungsbeurteilungController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Liefert alle aktiven Gefährdungsbeurteilungs-Vorlagen (seed-basiert).
   * Der Einsatz-Scope dient nur der Autorisierung; die Vorlagen sind
   * einsatzunabhängig.
   */
  @Get('gefaehrdungsbeurteilungs-vorlagen')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
  @ApiOperation({ summary: 'Aktive Gefährdungsbeurteilungs-Vorlagen abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(GefaehrdungsbeurteilungVorlageDto, {
    isArray: true,
    description: 'Liste aktiver Vorlagen, geordnet nach Name.',
  })
  async listVorlagen(@Param('einsatzId') einsatzId: string): Promise<GefaehrdungsbeurteilungVorlageDto[]> {
    const query = new ListGefaehrdungsbeurteilungsVorlagenQuery(einsatzId);
    const result = (await this.queryBus.execute(query)) as Result<GefaehrdungsbeurteilungVorlageReadModel[]>;
    if (result.isFailure || !result.value) {
      throw new InternalServerErrorException(result.error ?? 'Vorlagen konnten nicht geladen werden');
    }
    return result.value.map(toGefaehrdungsbeurteilungVorlageDto);
  }

  /**
   * Legt eine Gefährdungsbeurteilung für den aktuellen Einsatz an. Der Handler
   * führt AC6-Cross-Einsatz-Checks, den Business-Rule-Check (422 bei
   * Duplikat) und den optionalen Vorlagen-Lookup durch.
   */
  @Post('gefaehrdungsbeurteilungen')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')
  @ApiOperation({ summary: 'Neue Gefährdungsbeurteilung für eine Einheit anlegen' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiNotFoundResponse({ description: 'Einheit oder Vorlage existiert nicht (`context.resource`)' })
  @ApiUnprocessableEntityResponse({ description: 'Für die Einheit existiert bereits eine Beurteilung (`context.rule`)' })
  @ApiWrappedCreatedResponse(GefaehrdungsbeurteilungDto, {
    description: 'Die neu angelegte Gefährdungsbeurteilung — identisch zum GET-Response.',
  })
  async createBeurteilung(@Param('einsatzId') einsatzId: string, @Body() body: CreateGefaehrdungsbeurteilungDto, @CurrentUser() user: ValidatedUser): Promise<GefaehrdungsbeurteilungDto> {
    const commandResult = CreateGefaehrdungsbeurteilungCommand.create({
      einsatzId,
      einheitId: body.einheitId,
      createdBy: user.userId,
      vorlageId: body.vorlageId ?? null,
      gefahrenzoneId: body.gefahrenzoneId ?? null,
    });
    if (commandResult.isFailure || !commandResult.value) {
      // Validation-Fehler hier sollten bereits vom class-validator gefangen
      // werden; defensiv mappen wir sie trotzdem als 422 mit rule-context.
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: commandResult.error ?? 'Command konnte nicht erstellt werden',
        context: { rule: 'InvalidCommand' },
      });
    }

    const createResult = (await this.commandBus.execute(commandResult.value)) as Result<string>;
    if (createResult.isFailure || !createResult.value) {
      throw this.mapCommandError(createResult.error ?? 'Beurteilung konnte nicht erstellt werden');
    }

    // Nach dem Create das Read-Model laden, damit die Factory Persistenz-
    // Metadaten (erstelltAm, aktualisiertAm, aktualisiertVonUserId) hat.
    return this.loadDto(einsatzId, createResult.value);
  }

  /**
   * Aktualisiert die Items einer bestehenden Gefährdungsbeurteilung (Story 2.2).
   *
   * **Optimistic-Concurrency (Story 2.3, AC10):** Der Body enthält
   * `expectedVersion`; ein Mismatch führt zu HTTP 409 mit `context.currentVersion`
   * **und** `context.attemptedVersion`. Das Frontend rendert einen Banner mit
   * der konkreten aktuellen Version („Version 5 wurde bereits gespeichert"),
   * konsistent zur Zero-Toast-Policy UX-DR21.
   */
  @Post('gefaehrdungsbeurteilungen/:id/items')
  @HttpCode(HttpStatus.OK)
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:write')
  @ApiOperation({ summary: 'Items einer Gefährdungsbeurteilung aktualisieren (FR3, FR4)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Beurteilungs-ID (CUID)' })
  @ApiNotFoundResponse({ description: 'Beurteilung existiert nicht oder gehört zu einem anderen Einsatz (`context.resource`)' })
  @ApiConflictResponse({ description: 'Optimistic-Concurrency-Mismatch — `context.currentVersion` (Server-Stand) + `context.attemptedVersion` (Client-Annahme).' })
  @ApiUnprocessableEntityResponse({ description: 'Business-Rule-Verletzung oder Item-Validation (`context.rule`)' })
  @ApiWrappedResponse(GefaehrdungsbeurteilungDto, {
    description: 'Aktualisierte Gefährdungsbeurteilung mit inkrementierter Version.',
  })
  async updateItems(
    @Param('einsatzId') einsatzId: string,
    @Param('id') id: string,
    @Body() body: UpdateGefaehrdungsbeurteilungItemsDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<GefaehrdungsbeurteilungDto> {
    const commandResult = UpdateGefaehrdungsbeurteilungItemsCommand.create({
      einsatzId,
      gefaehrdungsbeurteilungId: id,
      userId: user.userId,
      expectedVersion: body.expectedVersion,
      items: body.items,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: commandResult.error ?? 'Command konnte nicht erstellt werden',
        context: { rule: 'InvalidCommand' },
      });
    }

    const updateResult = (await this.commandBus.execute(commandResult.value)) as Result<string>;
    if (updateResult.isFailure || !updateResult.value) {
      throw this.mapUpdateItemsError(updateResult.error ?? 'Update fehlgeschlagen', body.expectedVersion);
    }

    return this.loadDto(einsatzId, updateResult.value);
  }

  /**
   * Liefert eine einzelne Beurteilung. Cross-Einsatz-Check im Query-Handler
   * verhindert Existenz-Leaks über Einsatz-Grenzen hinweg.
   */
  @Get('gefaehrdungsbeurteilungen/:id')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
  @ApiOperation({ summary: 'Eine Gefährdungsbeurteilung per ID abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Beurteilungs-ID (CUID)' })
  @ApiNotFoundResponse({ description: 'Beurteilung existiert nicht oder gehört zu einem anderen Einsatz' })
  @ApiWrappedResponse(GefaehrdungsbeurteilungDto, {
    description: 'Die angeforderte Gefährdungsbeurteilung.',
  })
  async getBeurteilung(@Param('einsatzId') einsatzId: string, @Param('id') id: string): Promise<GefaehrdungsbeurteilungDto> {
    return this.loadDto(einsatzId, id);
  }

  /**
   * Liefert die Versions-Historie einer Gefährdungsbeurteilung (Story 2.4).
   *
   * Chronologisch absteigend (neueste Version zuerst), mit aufgelösten
   * User-Anzeige-Namen (bzw. `null` bei soft-deleted/gelockten Usern). Die
   * Klassen-Level-Guard-Kette (JwtAuthGuard → EinsatzScopeGuard →
   * EigenschutzRolleGuard → PermissionsGuard) gilt; die per-Route-Decoratoren
   * definieren nur die konkreten Rollen und die Read-Permission.
   *
   * Fehler-Mapping: `NotFound:Beurteilung` → 404 (symmetrisch zum
   * `getBeurteilung`-Endpoint), alles andere → 500 via `mapQueryError`.
   */
  @Get('gefaehrdungsbeurteilungen/:id/versionen')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
  @ApiOperation({ summary: 'Versionshistorie einer Gefährdungsbeurteilung (Story 2.4)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Beurteilungs-ID (CUID)' })
  @ApiNotFoundResponse({ description: 'Beurteilung existiert nicht oder gehört zu einem anderen Einsatz' })
  @ApiWrappedResponse(GefaehrdungsbeurteilungHistorieDto, {
    description: 'Chronologische Versions-Liste, absteigend sortiert (neueste Version zuerst).',
  })
  async getHistorie(@Param('einsatzId') einsatzId: string, @Param('id') id: string): Promise<GefaehrdungsbeurteilungHistorieDto> {
    const query = new GetGefaehrdungsbeurteilungHistorieQuery(einsatzId, id);
    const result = (await this.queryBus.execute(query)) as Result<HistorieReadModel>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Historie konnte nicht geladen werden');
    }
    return toHistorieDto(result.value);
  }

  /**
   * Lädt die Beurteilung per `GetGefaehrdungsbeurteilungQuery` und baut das
   * Response-DTO über die vorhandene Factory. Wird sowohl vom POST- als auch
   * vom GET-Endpoint genutzt, damit beide Responses Byte-gleich sind.
   */
  private async loadDto(einsatzId: string, id: string): Promise<GefaehrdungsbeurteilungDto> {
    const query = new GetGefaehrdungsbeurteilungQuery(einsatzId, id);
    const result = (await this.queryBus.execute(query)) as Result<GefaehrdungsbeurteilungReadModel>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Beurteilung konnte nicht geladen werden');
    }
    const readModel = result.value;
    return toGefaehrdungsbeurteilungDto({
      aggregate: readModel.aggregate,
      erstelltAm: readModel.erstelltAm,
      aktualisiertAm: readModel.aktualisiertAm,
      aktualisiertVonUserId: readModel.aktualisiertVonUserId,
    });
  }

  /**
   * Mapped Sentinel-Strings des Create-Handlers auf HTTP-Exceptions. Format
   * der Plattform-Error-Responses: `{ statusCode, error, message, context }`.
   * Der Sentinel-Split `type:resource` wird toLowerCase-normalisiert, damit
   * `context.resource` stets `'einheit' | 'vorlage'` liefert.
   */
  private mapCommandError(error: string): NotFoundException | UnprocessableEntityException | InternalServerErrorException {
    if (error.startsWith('NotFound:')) {
      const resource = error.slice('NotFound:'.length).toLowerCase();
      return new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: error,
        context: { resource },
      });
    }
    if (error.startsWith('BusinessRule:')) {
      const rule = error.slice('BusinessRule:'.length);
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule },
      });
    }
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
    });
  }

  /**
   * Mapped Sentinel-Strings des UpdateItems-Handlers auf HTTP-Exceptions —
   * Whitelist-Pattern (Story 2.3, AC11): nur explizit präfixte Sentinels
   * werden auf spezifische HTTP-Codes gemappt. Alles andere → 500 mit
   * `context.rule = 'Unexpected'` + Logger-Signal (Monitoring darf echte
   * DB-Ausfälle nicht als 422-Validation-Fehler verschleiert bekommen).
   *
   * Der 409-Context trägt neben `attemptedVersion` (aus dem Request-Body)
   * auch `currentVersion` aus dem `:current=<n>`-Suffix, das der Handler
   * an den ConflictDetected-Sentinel anhängt (AC10).
   */
  private mapUpdateItemsError(error: string, attemptedVersion: number): ConflictException | NotFoundException | UnprocessableEntityException | InternalServerErrorException {
    if (error.startsWith(GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED)) {
      // Suffix-Anchor: Der Sentinel hat die Form `ConflictDetected:…:current=<n>`
      // am Ende. Ohne `$` würde die Regex auch `current=` irgendwo in der Mitte
      // matchen (z. B. bei doppeltem Encoding oder wenn eine Debug-Message das
      // Token embedded) — was zu einer falschen `currentVersion` führen könnte.
      const match = error.match(/:current=(\d+)$/);
      const currentVersion = match?.[1] !== undefined ? Number.parseInt(match[1], 10) : undefined;
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: GEFAEHRDUNGSBEURTEILUNG_CONFLICT_DETECTED,
        context: { currentVersion, attemptedVersion },
      });
    }
    if (error === UPDATE_GEFAEHRDUNGSBEURTEILUNG_ITEMS_ERROR_CODES.BEURTEILUNG_NOT_FOUND) {
      return new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: error,
        context: { resource: 'beurteilung' },
      });
    }
    if (error.startsWith('NotFound:')) {
      const resource = error.slice('NotFound:'.length).toLowerCase();
      return new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: error,
        context: { resource },
      });
    }
    if (error.startsWith('BusinessRule:')) {
      const rule = error.slice('BusinessRule:'.length);
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule },
      });
    }
    if (error.startsWith('ValidationFailed:')) {
      // Item-Validation-Fehler aus VO (z. B. „Titel ist erforderlich") —
      // Handler hat den Raw-Error mit `ValidationFailed:`-Prefix verpackt,
      // damit wir ihn ohne Catch-all als 422 mappen können.
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule: 'ItemValidation' },
      });
    }
    if (error.startsWith('InfrastructureError:') || error.startsWith('Invariant:')) {
      // DB-/Prisma-/Transaktions-Fehler ODER Aggregate-Invariante-Bruch →
      // beide sind 500. `Invariant:` ist ein Server-Programmierfehler
      // (z. B. DiffSumMismatch), der per Design nicht Client-provozierbar ist.
      return new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error,
        context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' },
      });
    }
    // Unerkannter Fehler — weder vom Handler annotiert noch mit bekanntem
    // Präfix. Das deutet auf einen Plumbing-Bug (z. B. ein neu hinzugekommenes
    // Sentinel ohne Mapping) oder einen durchgerutschten Prisma-Raw-Fehler hin.
    // Monitoring soll das als 5xx-Spike sehen, nicht als 422 verschleiert.
    //
    // PII-Scrubbing: Der rohe `error`-String kann Prisma-Fehler-Messages mit
    // Row-/Column-Werten enthalten (z. B. bei Constraint-Violations). Wir
    // loggen daher nur den Sentinel-Prefix + `attemptedVersion`; der volle
    // Error-String wird ausschließlich im HTTP-Response-Body zurückgegeben
    // (dort erwartet/gewollt) und NICHT ins Log-Aggregation-Target.
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected update error', { errorCategory, attemptedVersion });
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
      context: { rule: 'Unexpected' },
    });
  }

  /**
   * Mapped Query-Sentinels auf HTTP-Exceptions — aktuell nur
   * `NotFound:Beurteilung` (symmetrisch zum Create-Handler AC6-Check).
   */
  private mapQueryError(error: string): NotFoundException | InternalServerErrorException {
    if (error.startsWith('NotFound:')) {
      const resource = error.slice('NotFound:'.length).toLowerCase();
      return new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: error,
        context: { resource },
      });
    }
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
    });
  }
}
