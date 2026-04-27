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
  Put,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AckSicherheitsregelCommand } from '@/application/eigenschutz/commands/ack-sicherheitsregel/ack-sicherheitsregel.command';
import type { AckSicherheitsregelResult } from '@/application/eigenschutz/commands/ack-sicherheitsregel/ack-sicherheitsregel.handler';
import { CreateSicherheitsregelCommand } from '@/application/eigenschutz/commands/create-sicherheitsregel/create-sicherheitsregel.command';
import { UpdateSicherheitsregelCommand } from '@/application/eigenschutz/commands/update-sicherheitsregel/update-sicherheitsregel.command';
import { AckSicherheitsregelDto } from '@/application/eigenschutz/dto/ack-sicherheitsregel.dto';
import { CreateSicherheitsregelDto } from '@/application/eigenschutz/dto/create-sicherheitsregel.dto';
import { SicherheitsregelDto } from '@/application/eigenschutz/dto/sicherheitsregel.dto';
import { SicherheitsregelQuittungDto } from '@/application/eigenschutz/dto/sicherheitsregel-quittung.dto';
import { toSicherheitsregelDto } from '@/application/eigenschutz/dto/sicherheitsregel.factory';
import { UpdateSicherheitsregelDto } from '@/application/eigenschutz/dto/update-sicherheitsregel.dto';
import { GetSicherheitsregelQuery } from '@/application/eigenschutz/queries/get-sicherheitsregel/get-sicherheitsregel.query';
import { ListSicherheitsregelnQuery } from '@/application/eigenschutz/queries/list-sicherheitsregeln/list-sicherheitsregeln.query';
import { ListSicherheitsregelQuittungenQuery } from '@/application/eigenschutz/queries/list-sicherheitsregel-quittungen/list-sicherheitsregel-quittungen.query';
import {
  SicherheitsregelCreateBodySchema,
  SicherheitsregelUpdateBodySchema,
  type SicherheitsregelCreateBody,
  type SicherheitsregelUpdateBody,
} from '@/application/eigenschutz/schemas/sicherheitsregel.zod';
import { ZodValidationPipe } from '@/modules/common/pipes/zod-validation.pipe';
import { Result } from '@domain/common/result';
import { SICHERHEITSREGEL_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/sicherheitsregel.aggregate';
import type { SicherheitsregelReadModel } from '@domain/eigenschutz/repositories/i-sicherheitsregel.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

/**
 * Controller für Sicherheitsregel-Endpunkte (Story 415-2-6, Task 6).
 *
 * Routen sind konsequent einsatz-scoped unter
 * `/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherheitsregeln[/...]`
 * (Memory-Regel „Einsatz-Routen-Nesting").
 *
 * ### Guard-Kette
 * ```
 * JwtAuthGuard → EinsatzScopeGuard
 * ```
 * Die Einsatz-Mitgliedschaft wird plattform-seitig geprüft; ein eigenes
 * Rollen-/Permission-Gating ist laut Story 2.5 Correct Course **nicht** Teil
 * dieses Schnitts (keine `useEigenschutzPermissions`-Wiedereinführung).
 * 403-Antworten bei fehlender Mitgliedschaft reicht der Guard direkt aus.
 *
 * ### Error-Mapping (AC2/AC3)
 * Die Handler liefern präfixierte Sentinel-Codes, die hier strukturiert auf
 * HTTP gemappt werden:
 * - `ConflictDetected:Sicherheitsregel[:current=<n>]` → 409 mit
 *   `context.currentVersion` + `context.attemptedVersion` (OCC-Kontrakt
 *   analog Story 2.3 Version-Chain-Hardening).
 * - `NotFound:<Resource>` → 404 mit `context.resource` (lowercase).
 * - `BusinessRule:<Rule>` → 422 mit `context.rule` (z. B.
 *   `NoChangesDetected`).
 * - `ValidationFailed:*` → 422 mit `context.rule = 'ItemValidation'`.
 * - `InfrastructureError:*` → 500 mit `context.layer = 'infrastructure'`.
 * - `Invariant:*` → 500 mit `context.layer = 'domain'`.
 * - Alles andere (unbekannter Sentinel, durchgerutschter Raw-Error) → 500
 *   mit `context.rule = 'Unexpected'` + strukturiertem Logger-Eintrag
 *   (nur Error-Kategorie, keine Raw-Strings → PII-Schutz).
 *
 * ### Fanout-Response-Shape (AC6)
 * - POST liefert bei einsatzweiter Regel ein 1-Element-Array, bei Multi-
 *   Einheit ein N-Element-Array.
 * - PUT liefert bei In-Place-Update `[regel]`, bei Re-Wire ein Array der neu
 *   erzeugten Rows (jede mit eigener ID, identischer `propagationGroupId`).
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Kein Zugriff auf diesen Einsatz (keine aktive Rollenbesetzung)' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard)
export class SicherheitsregelController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Listet aktive Sicherheitsregeln des Einsatzes (AC6).
   *
   * `einheitId` ist ein optionaler Query-Parameter für die spätere
   * Abschnittsleiter-Sicht (Story 2.7): ist er gesetzt, liefert der Handler
   * einsatzweite Regeln **plus** Regeln dieser konkreten Einheit.
   */
  @Get('sicherheitsregeln')
  @ApiOperation({ summary: 'Aktive Sicherheitsregeln des Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiQuery({
    name: 'einheitId',
    type: String,
    required: false,
    description: 'Optional: CUID einer Einsatzeinheit — liefert einsatzweite plus einheiten-spezifische Regeln.',
  })
  @ApiWrappedResponse(SicherheitsregelDto, {
    isArray: true,
    description: 'Liste aktiver Sicherheitsregeln, zuletzt aktualisierte zuerst.',
  })
  async listRegeln(@Param('einsatzId') einsatzId: string, @Query('einheitId') einheitId?: string): Promise<SicherheitsregelDto[]> {
    // Leerer String aus dem Query-String (TanStack-Router-/HTTP-Quirk:
    // `?einheitId=` ohne Wert) als „Filter abwesend" interpretieren — sonst
    // verwirft die Repo-Where-Klausel `einheitId === ''` zu einem leeren
    // Resultset, das wie ein UI-Bug wirkt.
    const trimmedEinheitId = typeof einheitId === 'string' && einheitId.length > 0 ? einheitId : undefined;
    const query = new ListSicherheitsregelnQuery(einsatzId, trimmedEinheitId);
    const result = (await this.queryBus.execute(query)) as Result<SicherheitsregelReadModel[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Sicherheitsregeln konnten nicht geladen werden');
    }
    return result.value.map(toSicherheitsregelDto);
  }

  /**
   * Liefert eine einzelne Sicherheitsregel per ID. Der Cross-Einsatz-Check im
   * Query-Handler verhindert Existenz-Leaks über Einsatz-Grenzen hinweg.
   */
  @Get('sicherheitsregeln/:id')
  @ApiOperation({ summary: 'Eine Sicherheitsregel per ID abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Sicherheitsregel-ID (CUID)' })
  @ApiNotFoundResponse({ description: 'Regel existiert nicht oder gehört zu einem anderen Einsatz (`context.resource`)' })
  @ApiWrappedResponse(SicherheitsregelDto, {
    description: 'Die angeforderte Sicherheitsregel.',
  })
  async getRegel(@Param('einsatzId') einsatzId: string, @Param('id') id: string): Promise<SicherheitsregelDto> {
    return this.loadDto(einsatzId, id);
  }

  /**
   * Legt eine Sicherheitsregel für den aktuellen Einsatz an (AC2).
   *
   * **Fanout-Semantik:** Bei `einsatzweit === true` entsteht eine einzige
   * Row mit `einheitId = null`; bei `einsatzweit === false` wird pro
   * übergebener Einheit eine eigene Row erzeugt, alle mit derselben
   * `propagationGroupId`. Der Response ist immer ein Array — Client-seitig
   * sauberer als zwei unterschiedliche Response-Shapes.
   */
  @Post('sicherheitsregeln')
  @ApiOperation({ summary: 'Neue Sicherheitsregel anlegen (einsatzweit oder Fanout an Einheiten)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiBody({ type: CreateSicherheitsregelDto })
  @ApiBadRequestResponse({ description: 'Validation-Drift gegen Zod-Schema (Discriminated Union, `context.rule = ZodValidationFailed`)' })
  @ApiNotFoundResponse({ description: 'Eine angegebene Einheit existiert nicht im Einsatz (`context.resource`)' })
  @ApiUnprocessableEntityResponse({ description: 'Validation-/Business-Rule-Verletzung (`context.rule`)' })
  @ApiWrappedCreatedResponse(SicherheitsregelDto, {
    isArray: true,
    description: 'Liste der neu erzeugten Sicherheitsregeln (eine pro Fanout-Ziel bzw. eine einzige Row bei einsatzweiter Regel).',
  })
  async createRegeln(
    @Param('einsatzId') einsatzId: string,
    @Body(new ZodValidationPipe(SicherheitsregelCreateBodySchema)) body: SicherheitsregelCreateBody,
    @CurrentUser() user: ValidatedUser,
  ): Promise<SicherheitsregelDto[]> {
    // Zod-Pipe hat oben bereits die Discriminated Union enforciert: bei
    // `einsatzweit === true` ist `einheitIds` strukturell abwesend, bei
    // `einsatzweit === false` mindestens 1 Element. Der Trim auf Titel und
    // Inhalt ist ebenfalls geschehen — der Command bekommt saubere Werte.
    const einheitIds: string[] | null = body.einsatzweit ? null : body.einheitIds;

    const commandResult = CreateSicherheitsregelCommand.create({
      einsatzId,
      createdBy: user.userId,
      titel: body.titel,
      inhalt: body.inhalt,
      einheitIds,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: commandResult.error ?? 'Command konnte nicht erstellt werden',
        context: { rule: 'InvalidCommand' },
      });
    }

    const createResult = (await this.commandBus.execute(commandResult.value)) as Result<string[]>;
    if (createResult.isFailure || !createResult.value) {
      throw this.mapMutationError(createResult.error ?? 'Sicherheitsregel konnte nicht erstellt werden');
    }

    // Nach dem Create alle erzeugten Read-Models laden, damit Timestamps +
    // propagationGroupId aus der Persistenz kommen (und nicht aus einer
    // simulierten Aggregate-Sicht).
    return Promise.all(createResult.value.map((id) => this.loadDto(einsatzId, id)));
  }

  /**
   * Aktualisiert eine Sicherheitsregel (AC3: In-Place) oder kündigt sie ab
   * und erzeugt neue Rows (AC4: Re-Wire). Die Unterscheidung trifft der
   * Handler anhand des übergebenen Ziel-Sets; der Controller reicht die
   * DTO-Liste nach außen durch.
   *
   * **Optimistic-Concurrency (AC10):** Der Body enthält `expectedVersion`;
   * ein Mismatch führt zu HTTP 409 mit `context.currentVersion` (aus dem
   * Sentinel-Suffix `:current=<n>`) UND `context.attemptedVersion`.
   */
  @Put('sicherheitsregeln/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sicherheitsregel aktualisieren (In-Place oder Re-Wire) — AC3/AC4/AC10' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Sicherheitsregel-ID (CUID)' })
  @ApiBody({ type: UpdateSicherheitsregelDto })
  @ApiBadRequestResponse({ description: 'Validation-Drift gegen Zod-Schema (Discriminated Union, `context.rule = ZodValidationFailed`)' })
  @ApiNotFoundResponse({ description: 'Regel/Einheit existiert nicht oder gehört zu einem anderen Einsatz (`context.resource`)' })
  @ApiConflictResponse({ description: 'Optimistic-Concurrency-Mismatch — `context.currentVersion` + `context.attemptedVersion`.' })
  @ApiUnprocessableEntityResponse({ description: 'Validation- oder Business-Rule-Verletzung, z. B. `NoChangesDetected` (`context.rule`)' })
  @ApiWrappedResponse(SicherheitsregelDto, {
    isArray: true,
    description: 'Liste der aktiven Rows nach dem Update — In-Place: 1 Element mit identischer ID; Re-Wire: N neu erzeugte Rows.',
  })
  async updateRegel(
    @Param('einsatzId') einsatzId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SicherheitsregelUpdateBodySchema)) body: SicherheitsregelUpdateBody,
    @CurrentUser() user: ValidatedUser,
  ): Promise<SicherheitsregelDto[]> {
    const einheitIds: string[] | null = body.einsatzweit ? null : body.einheitIds;

    const commandResult = UpdateSicherheitsregelCommand.create({
      einsatzId,
      regelId: id,
      userId: user.userId,
      expectedVersion: body.expectedVersion,
      titel: body.titel,
      inhalt: body.inhalt,
      einheitIds,
    });
    if (commandResult.isFailure || !commandResult.value) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: commandResult.error ?? 'Command konnte nicht erstellt werden',
        context: { rule: 'InvalidCommand' },
      });
    }

    const updateResult = (await this.commandBus.execute(commandResult.value)) as Result<string[]>;
    if (updateResult.isFailure || !updateResult.value) {
      throw this.mapMutationError(updateResult.error ?? 'Update fehlgeschlagen', body.expectedVersion);
    }

    return Promise.all(updateResult.value.map((regelId) => this.loadDto(einsatzId, regelId)));
  }

  /**
   * Quittiert eine Sicherheitsregel durch eine konkrete Einheit (Story 2.7 AC2).
   *
   * - **Idempotenz** (AC3): Doppelte Sends mit identischem `(regelId, einheitId)`
   *   führen zu HTTP 204, ohne neues Event in der Outbox.
   * - **OCC** (optional): `expectedRegelVersion` im Body schützt gegen Quittung
   *   auf veralteter Banner-Version → 409.
   * - **Authorization** (AC4): Caller muss Mitglied der `einheitId` im Einsatz
   *   sein (Plattform-Permission deferred, AC5).
   */
  @Post('sicherheitsregeln/:id/quittieren')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sicherheitsregel durch eine konkrete Einheit quittieren — AC2/AC3/AC4' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Sicherheitsregel-ID (CUID)' })
  @ApiBody({ type: AckSicherheitsregelDto })
  @ApiNoContentResponse({ description: 'Quittung erfolgreich (sowohl Erst-Insert als auch idempotenter Re-Ack — kein Body).' })
  @ApiNotFoundResponse({ description: 'Regel existiert nicht oder ist abgekündigt (`context.resource`)' })
  @ApiConflictResponse({ description: 'Optimistic-Concurrency-Mismatch — `context.currentVersion` + `context.attemptedVersion`.' })
  @ApiUnprocessableEntityResponse({ description: 'Caller-Authorization (`UnzulaessigeEinheitenZuordnung`) oder Regel/Einheit-Mismatch (`context.rule`)' })
  async quittieren(@Param('einsatzId') einsatzId: string, @Param('id') regelId: string, @Body() body: AckSicherheitsregelDto, @CurrentUser() user: ValidatedUser): Promise<void> {
    const command = new AckSicherheitsregelCommand(einsatzId, regelId, body.einheitId, user.userId, body.expectedRegelVersion);
    const result = (await this.commandBus.execute(command)) as Result<AckSicherheitsregelResult>;
    if (result.isFailure) {
      throw this.mapMutationError(result.error ?? 'Quittung fehlgeschlagen', body.expectedRegelVersion);
    }
    // Idempotenter Re-Ack ist ebenfalls 204 — der Controller unterscheidet
    // bewusst nicht zwischen `created` und `alreadyAcknowledged` (Story 2.7
    // AC3: keine 409, kein 422).
  }

  /**
   * Listet alle Quittungen einer Sicherheitsregel (Story 2.7 AC10) — Sender-View.
   */
  @Get('sicherheitsregeln/:id/quittungen')
  @ApiOperation({ summary: 'Quittungen einer Sicherheitsregel auflisten (Sender-View)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiParam({ name: 'id', type: String, description: 'Sicherheitsregel-ID (CUID)' })
  @ApiWrappedResponse(SicherheitsregelQuittungDto, {
    isArray: true,
    description: 'Liste aller Quittungen, sortiert nach `quittiertAm` absteigend.',
  })
  async listQuittungen(@Param('einsatzId') einsatzId: string, @Param('id') regelId: string): Promise<SicherheitsregelQuittungDto[]> {
    const query = new ListSicherheitsregelQuittungenQuery(einsatzId, regelId);
    const result = (await this.queryBus.execute(query)) as Result<SicherheitsregelQuittungDto[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Quittungen konnten nicht geladen werden');
    }
    return result.value;
  }

  /**
   * Lädt eine Regel per `GetSicherheitsregelQuery` und mapped sie über die
   * vorhandene Factory. Einheitlicher Helfer für GET, POST und PUT — damit
   * alle Response-Shapes Byte-gleich sind.
   */
  private async loadDto(einsatzId: string, id: string): Promise<SicherheitsregelDto> {
    const query = new GetSicherheitsregelQuery(einsatzId, id);
    const result = (await this.queryBus.execute(query)) as Result<SicherheitsregelReadModel>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Sicherheitsregel konnte nicht geladen werden');
    }
    return toSicherheitsregelDto(result.value);
  }

  /**
   * Mapped Mutation-Sentinels (Create + Update) auf HTTP-Exceptions — Whitelist-
   * Pattern: nur präfixierte Sentinels werden auf spezifische Codes gemappt;
   * alles andere landet als 500 mit `context.rule = 'Unexpected'` + Logger-
   * Warning. Monitoring darf echte DB-Ausfälle nicht als 422 verschleiert
   * bekommen (analog zum `mapUpdateItemsError` im Gefährdungsbeurteilungs-
   * Controller).
   *
   * `attemptedVersion` ist nur für den Update-Pfad relevant; Create ruft ohne
   * Parameter auf, der 409-Zweig wird dann nicht erreicht (Create kennt kein
   * OCC-Token, der Handler liefert die Conflict-Sentinels nur für Updates).
   */
  private mapMutationError(error: string, attemptedVersion?: number): ConflictException | NotFoundException | UnprocessableEntityException | InternalServerErrorException {
    if (error.startsWith(SICHERHEITSREGEL_CONFLICT_DETECTED)) {
      // Suffix-Anchor: Sentinel-Form `ConflictDetected:Sicherheitsregel:current=<n>`.
      // Ohne `$` würde die Regex auch `current=` irgendwo in der Mitte matchen
      // (z. B. bei doppelter Encodierung) — was zu falscher `currentVersion`
      // führt.
      const match = error.match(/:current=(\d+)$/);
      const currentVersion = match?.[1] !== undefined ? Number.parseInt(match[1], 10) : undefined;
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: SICHERHEITSREGEL_CONFLICT_DETECTED,
        context: { currentVersion, attemptedVersion },
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
      // (per Design nicht Client-provozierbar).
      return new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error,
        context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' },
      });
    }
    // Unerkannter Fehler — weder vom Handler annotiert noch mit bekanntem
    // Präfix. PII-Scrubbing: wir loggen nur die Sentinel-Kategorie + den
    // (ggf. vorhandenen) `attemptedVersion`-Kontext; der volle Error-String
    // wird NICHT ins Log-Aggregation-Target geschrieben.
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected sicherheitsregel mutation error', { errorCategory, attemptedVersion });
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
      context: { rule: 'Unexpected' },
    });
  }

  /**
   * Mapped Query-Sentinels (List + Get) auf HTTP-Exceptions — aktuell nur
   * `NotFound:*` → 404, alles andere → 500.
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
