import {
  BadRequestException,
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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { PsaProfilZuweisungReadRow } from '@domain/eigenschutz/repositories/i-psa-profil-zuweisung.repository';
import { PSA_PROFIL_CONFLICT_DETECTED } from '@domain/eigenschutz/aggregates/psa-profil-zuweisung.aggregate';
import { LOGGER } from '@infrastructure/di-tokens';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { AckPsaQuittungCommand } from '@/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.command';
import type { AckPsaQuittungResult } from '@/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.handler';
import { ChangePsaProfilCommand } from '@/application/eigenschutz/commands/change-psa-profil/change-psa-profil.command';
import type { ChangePsaProfilResult } from '@/application/eigenschutz/commands/change-psa-profil/change-psa-profil.command';
import { MeldeLueckeCommand } from '@/application/eigenschutz/commands/melde-luecke/melde-luecke.command';
import type { MeldeLueckeResult } from '@/application/eigenschutz/commands/melde-luecke/melde-luecke.handler';
import { AckPsaQuittungDto } from '@/application/eigenschutz/dto/ack-psa-quittung.dto';
import { MeldeLueckeDto } from '@/application/eigenschutz/dto/melde-luecke.dto';
import { BulkChangePsaProfilDto, ChangePsaProfilDto, ChangePsaProfilResponseDto, PsaProfilZuweisungDto } from '@/application/eigenschutz/dto/change-psa-profil.dto';
import { OffenePsaBekanntgabeEntryDto } from '@/application/eigenschutz/dto/offene-psa-bekanntgabe-entry.dto';
import { OffeneRueckmeldungDto } from '@/application/eigenschutz/dto/offene-rueckmeldung.dto';
import { PsaQuittungEntryDto } from '@/application/eigenschutz/dto/psa-quittung-entry.dto';
import { GetPsaProfileByEinheitQuery } from '@/application/eigenschutz/queries/get-psa-profile-by-einheit/get-psa-profile-by-einheit.query';
import { ListOffenePsaBekanntgabenQuery } from '@/application/eigenschutz/queries/list-offene-psa-bekanntgaben/list-offene-psa-bekanntgaben.query';
import { ListOffeneRueckmeldungenQuery } from '@/application/eigenschutz/queries/list-offene-rueckmeldungen/list-offene-rueckmeldungen.query';
import { ListPsaQuittungenQuery } from '@/application/eigenschutz/queries/list-psa-quittungen/list-psa-quittungen.query';

/**
 * Controller für PSA-Profil-Endpoints (Story 3.1).
 *
 * Routen sind einsatz-scoped unter
 * `/einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/...` (Memory-Regel
 * „Einsatz-Routen-Nesting").
 *
 * ### Guard-Kette
 * ```
 * JwtAuthGuard
 * ```
 * Eigenschutz hat kein eigenes Rollen-/Permission-Gating; Cross-Einsatz-
 * Schutz erfolgt in den Query-/Command-Handlern.
 *
 * ### Error-Mapping
 * - `ConflictDetected:PsaProfilZuweisung[:current=<n>]` → 409 mit
 *   `context.currentVersion` + `context.attemptedVersion`.
 * - `ConflictDetected:DuplicateActivePsaProfilZuweisung` → 409 mit
 *   `context.rule = 'DuplicateActiveProfile'`.
 * - `NotFound:*` → 404 mit `context.resource`.
 * - `BusinessRule:*` → 422 mit `context.rule`.
 * - `Invariant:*` / `InfrastructureError:*` → 500.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class PsaProfilController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Liefert die aktuell aktiven PSA-Profile einer Einheit (AC9 Pre-Fill).
   */
  @Get('einheiten/:einheitId')
  @ApiOperation({ summary: 'Aktive PSA-Profile einer Einheit laden' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'einheitId', type: String, description: 'CUID der Einsatzeinheit' })
  @ApiWrappedResponse(PsaProfilZuweisungDto, { isArray: true, description: 'Liste der aktiven PSA-Profile (gueltigBis IS NULL).' })
  async getPsaProfile(@Param('einsatzId') einsatzId: string, @Param('einheitId') einheitId: string): Promise<PsaProfilZuweisungDto[]> {
    const result = (await this.queryBus.execute(new GetPsaProfileByEinheitQuery(einsatzId, einheitId))) as Result<PsaProfilZuweisungReadRow[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'PSA-Profile konnten nicht geladen werden');
    }
    return result.value.map(toPsaProfilZuweisungDto);
  }

  /**
   * Aktiviert/Deaktiviert PSA-Profile einer Einheit (AC1/AC2/AC3).
   */
  @Post('einheiten/:einheitId/change')
  @ApiOperation({ summary: 'PSA-Profil-Toggle einer Einheit ausführen' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'einheitId', type: String, description: 'CUID der Einsatzeinheit' })
  @ApiBody({ type: ChangePsaProfilDto })
  @ApiWrappedCreatedResponse(ChangePsaProfilResponseDto, { description: 'Toggle erfolgreich. Liefert Propagation-Group + alle betroffenen Zuweisungs-Rows.' })
  @ApiNotFoundResponse({ description: 'Aktive Zuweisung zum Schließen nicht gefunden' })
  @ApiUnprocessableEntityResponse({ description: 'BusinessRule-Verletzung (z. B. expectedVersion fehlt, Toggle-Liste leer)' })
  @ApiConflictResponse({ description: 'Optimistic-Concurrency- oder Doppelaktivierungs-Konflikt' })
  async changePsaProfil(
    @Param('einsatzId') einsatzId: string,
    @Param('einheitId') einheitId: string,
    @Body() body: ChangePsaProfilDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ChangePsaProfilResponseDto> {
    const command = new ChangePsaProfilCommand(
      einsatzId,
      [einheitId],
      body.profilToggles.map((t) => ({ profil: t.profil, aktivieren: t.aktivieren, expectedVersion: t.expectedVersion })),
      body.begruendung,
      user.userId,
    );

    const result = (await this.commandBus.execute(command)) as Result<ChangePsaProfilResult>;
    if (result.isFailure || !result.value) {
      throw this.mapMutationError(result.error ?? 'PSA-Profil-Änderung fehlgeschlagen', (profilHint) => extractAttemptedVersion(body, profilHint));
    }

    const affected = await this.fetchAffected(einsatzId, einheitId, result.value, user.userId, body.begruendung);
    return {
      propagationGroupId: result.value.propagationGroupId,
      affected,
    };
  }

  /**
   * Bulk-Aktivierung/Deaktivierung von PSA-Profilen über mehrere Einheiten
   * (Story 3.2 AC4/AC10).
   *
   * Atomar in einer TX: bei Conflict für eine beliebige Einheit rollt die
   * gesamte Operation zurück und der Sentinel trägt `einheit=<id>` und
   * `profil=<p>` als Kontext für den UI-Banner.
   */
  @Post('bulk-aendern')
  @ApiOperation({ summary: 'PSA-Profil-Toggle gleichzeitig auf mehrere Einheiten anwenden (Bulk)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiBody({ type: BulkChangePsaProfilDto })
  @ApiWrappedCreatedResponse(ChangePsaProfilResponseDto, { description: 'Bulk-Toggle erfolgreich. Liefert die gemeinsame propagationGroupId und alle betroffenen Zuweisungen über alle Einheiten.' })
  @ApiNotFoundResponse({ description: 'Aktive Zuweisung zum Schließen nicht gefunden' })
  @ApiUnprocessableEntityResponse({ description: 'BusinessRule-Verletzung (z. B. zu viele Einheiten, expectedVersion fehlt)' })
  @ApiConflictResponse({ description: 'Optimistic-Concurrency- oder Doppelaktivierungs-Konflikt — context enthält einheitId + profil' })
  async bulkChangePsaProfil(@Param('einsatzId') einsatzId: string, @Body() body: BulkChangePsaProfilDto, @CurrentUser() user: ValidatedUser): Promise<ChangePsaProfilResponseDto> {
    const command = new ChangePsaProfilCommand(
      einsatzId,
      body.einheitIds,
      body.profilToggles.map((t) => ({ profil: t.profil, aktivieren: t.aktivieren, expectedVersion: t.expectedVersion })),
      body.begruendung,
      user.userId,
    );

    const result = (await this.commandBus.execute(command)) as Result<ChangePsaProfilResult>;
    if (result.isFailure || !result.value) {
      throw this.mapMutationError(result.error ?? 'PSA-Profil-Bulk-Änderung fehlgeschlagen', (profilHint) => extractAttemptedVersion(body, profilHint));
    }

    const affected = await this.fetchAffectedBulk(einsatzId, body.einheitIds, result.value, user.userId, body.begruendung);
    return {
      propagationGroupId: result.value.propagationGroupId,
      affected,
    };
  }

  /**
   * Listet einzelne offene Ausrüstungs-Lücken-Rückmeldungen für das
   * einsatzweite Eigenschutz-Seitenpanel.
   *
   * **Routing-Reihenfolge:** Diese statische Route bleibt vor den dynamischen
   * `propagation-groups/:propagationGroupId/...`-Routen, damit der
   * Express-Style-Matcher keine statischen Literale als `propagationGroupId`
   * interpretiert.
   */
  @Get('rueckmeldungen/offen')
  @ApiOperation({ summary: 'Offene Ausrüstungs-Lücken-Rückmeldungen eines Einsatzes auflisten' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiWrappedResponse(OffeneRueckmeldungDto, {
    isArray: true,
    description: 'Liste offener Rückmeldungen, sortiert nach gemeldetAm DESC und stabilisiert über id ASC.',
  })
  async listOffeneRueckmeldungen(@Param('einsatzId') einsatzId: string): Promise<OffeneRueckmeldungDto[]> {
    const result = (await this.queryBus.execute(new ListOffeneRueckmeldungenQuery(einsatzId))) as Result<OffeneRueckmeldungDto[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Offene Rückmeldungen konnten nicht geladen werden');
    }
    return result.value;
  }

  /**
   * Quittiert eine PSA-Profil-Bekanntgabe-Gruppe durch eine konkrete Einheit
   * (Story 3.4 AC1/AC2/AC3/AC7).
   *
   * - **Idempotenz** (AC3): Doppelte Sends mit identischem
   *   `(propagationGroupId, einheitId)` führen zu HTTP 204, ohne neues Event
   *   in der Outbox.
   * - **Authorization** (AC2 + AC6): `eigenschutz:psa:acknowledge`-Permission
   *   auf Controller-Ebene; defense-in-depth-Caller-Authorization im Handler
   *   (Caller-Mitgliedschaft in `einheitId`).
   * - **NotFound** (AC1): Keine `eigenschutz.psa_profil_geaendert`-Outbox-
   *   Row für `(propagationGroupId, einheitId)` → 404 mit
   *   `context.resource = 'psapropagation'`.
   */
  /**
   * Meldet eine Ausrüstungs-Lücke zu einer offenen PSA-Bekanntgabe (Story 3.6 AC6, FR20).
   *
   * **Workflow-Variante** (Q2-Default): Lücke-Meldung impliziert eine Quittung
   * — wenn keine `PsaProfilQuittung`-Row existiert, wird sie atomar mit
   * `lueckeGemeldet=true` angelegt; existiert sie bereits (vorab quittiert),
   * wird `lueckeGemeldet/lueckeNotiz` per UPDATE gesetzt. Beide Pfade
   * emittieren genau ein `LueckeGemeldetEvent`, KEIN zusätzliches
   * `QuittungAbgegebenEvent`.
   */
  @Post('propagation-groups/:propagationGroupId/luecke-melden')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ausrüstungs-Lücke zu einer PSA-Bekanntgabe melden — Story 3.6 AC6' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'propagationGroupId', type: String, description: 'CUID der Bekanntgabe-Gruppe' })
  @ApiBody({ type: MeldeLueckeDto })
  @ApiNoContentResponse({ description: 'Lücke gemeldet (Erst-Insert oder Update einer bestehenden Quittung — kein Body).' })
  @ApiBadRequestResponse({ description: 'DTO-Validation (cuid2-Regex / Length-Constraints)' })
  @ApiNotFoundResponse({ description: 'Keine offene PsaProfilGeaendert-Outbox-Row für (propagationGroupId, einheitId)' })
  @ApiUnprocessableEntityResponse({ description: 'Caller-Authorization (UnzulaessigeEinheitenZuordnung) oder LueckeNotizLeer (Whitespace-only)' })
  async meldeLuecke(@Param('einsatzId') einsatzId: string, @Param('propagationGroupId') propagationGroupId: string, @Body() body: MeldeLueckeDto, @CurrentUser() user: ValidatedUser): Promise<void> {
    const command = new MeldeLueckeCommand(einsatzId, propagationGroupId, body.einheitId, body.meldung, user.userId);
    const result = (await this.commandBus.execute(command)) as Result<MeldeLueckeResult>;
    if (result.isFailure) {
      throw this.mapAckError(result.error ?? 'PSA-Lücken-Meldung fehlgeschlagen');
    }
    // Beide Pfade (Create + Update) liefern 204 — der Controller unterscheidet
    // nicht zwischen Erst-Meldung und Notiz-Korrektur (Idempotenz-fähig).
  }

  @Post('propagation-groups/:propagationGroupId/quittieren')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'PSA-Profil-Änderung durch eine konkrete Einheit quittieren — AC1/AC2/AC3' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'propagationGroupId', type: String, description: 'CUID der Bekanntgabe-Gruppe' })
  @ApiBody({ type: AckPsaQuittungDto })
  @ApiNoContentResponse({ description: 'Quittung erfolgreich (Erst-Insert oder idempotenter Re-Ack — kein Body).' })
  @ApiNotFoundResponse({ description: 'Keine offene PsaProfilGeaendert-Outbox-Row für (propagationGroupId, einheitId)' })
  @ApiUnprocessableEntityResponse({ description: 'Caller-Authorization (UnzulaessigeEinheitenZuordnung)' })
  async quittieren(@Param('einsatzId') einsatzId: string, @Param('propagationGroupId') propagationGroupId: string, @Body() body: AckPsaQuittungDto, @CurrentUser() user: ValidatedUser): Promise<void> {
    const command = new AckPsaQuittungCommand(einsatzId, propagationGroupId, body.einheitId, user.userId);
    const result = (await this.commandBus.execute(command)) as Result<AckPsaQuittungResult>;
    if (result.isFailure) {
      throw this.mapAckError(result.error ?? 'PSA-Quittung fehlgeschlagen');
    }
    // Idempotenter Re-Ack ist ebenfalls 204 — der Controller unterscheidet
    // bewusst nicht zwischen `created` und `alreadyAcknowledged` (Story 3.4
    // AC3).
  }

  /**
   * Listet alle offenen PSA-Bekanntgabe-Gruppen (Story 3.4 AC15).
   *
   * Default-Zeitfenster: `now() - 24h`. `seit`-Query-Parameter überschreibt
   * den Default. Vollständig quittierte Gruppen (`status === 'complete'`)
   * verschwinden aus der Liste — gemäß UX-Spec „Banner verschwindet".
   *
   * **Routing-Reihenfolge:** Diese statische Route MUSS vor der dynamischen
   * `propagation-groups/:propagationGroupId/quittungen` registriert sein
   * (Express-Style-Matcher) — sonst würde `:propagationGroupId` mit dem
   * Literal `offene-bekanntgaben` matchen und der falsche Handler greifen.
   */
  @Get('propagation-groups/offene-bekanntgaben')
  @ApiOperation({ summary: 'Offene PSA-Bekanntgaben des Einsatzes auflisten (pending/partial) — AC15' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiQuery({
    name: 'seit',
    type: String,
    required: false,
    description: 'ISO-DateTime — nur Bekanntgaben ab diesem Zeitpunkt. Default: `now() - 24h`.',
  })
  @ApiWrappedResponse(OffenePsaBekanntgabeEntryDto, {
    isArray: true,
    description: 'Liste der offenen Bekanntgabe-Gruppen, sortiert nach `occurredAt DESC`.',
  })
  async listOffeneBekanntgaben(@Param('einsatzId') einsatzId: string, @Query('seit') seit?: string): Promise<OffenePsaBekanntgabeEntryDto[]> {
    // Leerer String aus dem Query-String (?seit=) als „Filter abwesend"
    // interpretieren — der Handler greift dann auf den 24h-Default zurück.
    const trimmedSeit = typeof seit === 'string' && seit.length > 0 ? seit : undefined;
    // Caller mit kaputtem ISO darf nicht stillschweigend auf den 24h-Default
    // fallen (würde verschleiern, dass der Filter ignoriert wurde) — explizit
    // mit 400 ablehnen.
    if (trimmedSeit !== undefined && Number.isNaN(new Date(trimmedSeit).getTime())) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'seit muss ein gültiger ISO-DateTime-String sein',
        context: { rule: 'InvalidSeitParameter' },
      });
    }
    const result = (await this.queryBus.execute(new ListOffenePsaBekanntgabenQuery(einsatzId, trimmedSeit))) as Result<OffenePsaBekanntgabeEntryDto[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Offene PSA-Bekanntgaben konnten nicht geladen werden');
    }
    return result.value;
  }

  /**
   * Listet den Quittungs-Stand einer PSA-Bekanntgabe-Gruppe (Story 3.4 AC8).
   *
   * Liefert eine Zeile pro erwartetem Empfänger der Bekanntgabe — Status
   * `AUSSTEHEND` oder `QUITTIERT`. Sender-View / Stab-Sicht.
   */
  @Get('propagation-groups/:propagationGroupId/quittungen')
  @ApiOperation({ summary: 'Quittungs-Stand einer PSA-Bekanntgabe-Gruppe auflisten (Sender-View) — AC8' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'propagationGroupId', type: String, description: 'CUID der Bekanntgabe-Gruppe' })
  @ApiWrappedResponse(PsaQuittungEntryDto, {
    isArray: true,
    description: 'Liste der erwarteten Empfänger mit Status AUSSTEHEND oder QUITTIERT.',
  })
  async listQuittungen(@Param('einsatzId') einsatzId: string, @Param('propagationGroupId') propagationGroupId: string): Promise<PsaQuittungEntryDto[]> {
    const result = (await this.queryBus.execute(new ListPsaQuittungenQuery(einsatzId, propagationGroupId))) as Result<PsaQuittungEntryDto[]>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'PSA-Quittungen konnten nicht geladen werden');
    }
    return result.value;
  }

  /**
   * Sentinel-Mapping für den PSA-Quittierungs-Pfad (Story 3.4 AC7). Eigene
   * Helper-Methode statt Wiederverwendung von `mapMutationError`, weil der
   * Quittierungs-Pfad keine OCC-Conflict-Sentinels kennt — und die
   * `attemptedVersionFor`-Closure-Signatur dort nicht passt.
   */
  private mapAckError(error: string): NotFoundException | UnprocessableEntityException | ConflictException | InternalServerErrorException {
    if (error.startsWith('NotFound:')) {
      const resource = error.slice('NotFound:'.length).toLowerCase();
      return new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: error,
        context: { resource },
      });
    }
    if (error.startsWith('ConflictDetected:')) {
      // Forward-Compat: aktuelle Story 3.4 wirft keine Conflict-Sentinels im
      // Quittungs-Pfad, aber Story 3.6 (Lücken-Meldung) könnte sie einführen.
      // Defense-in-Depth: 409 statt Default-500-Fallback.
      const rule = error.slice('ConflictDetected:'.length);
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: error,
        context: { rule },
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
      return new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error,
        context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' },
      });
    }
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected PSA-Quittung mutation error', { errorCategory });
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
      context: { rule: 'Unexpected' },
    });
  }

  private async fetchAffectedBulk(einsatzId: string, einheitIds: readonly string[], result: ChangePsaProfilResult, callerUserId: string, begruendung: string): Promise<PsaProfilZuweisungDto[]> {
    // Pro Einheit denselben Refetch-Pfad mit Synthetic-Fallback laufen lassen
    // (Story 3.1 P-13). Falls die Read-Query für eine Einheit fehlschlägt,
    // bekommt der Client für genau diese Einheit den Synthetic-Snapshot —
    // andere Einheiten liefern den frischen Server-State. Bewusste
    // Konsistenz-Lücke; dokumentiert in Story 3.1 deferred-work `ext-of-3.1`.
    const all: PsaProfilZuweisungDto[] = [];
    for (const einheitId of einheitIds) {
      const partial = await this.fetchAffected(einsatzId, einheitId, result, callerUserId, begruendung);
      all.push(...partial);
    }
    return all;
  }

  private async fetchAffected(einsatzId: string, einheitId: string, result: ChangePsaProfilResult, callerUserId: string, begruendung: string): Promise<PsaProfilZuweisungDto[]> {
    // Read-Pfad nach Mutation: liefert nur die aktuell aktiven Rows. Für die
    // Audit-Sicht (DEAKTIVIERT-Rows mit `gueltigBis !== null`) baut
    // Story 3.11 / Story 3.4 separate Queries — Story 3.1 gibt im Response
    // den `affectedZuweisungen`-Snapshot zurück, der vom Handler aus den
    // mutierten Aggregate-Versionen kommt.
    const queryResult = (await this.queryBus.execute(new GetPsaProfileByEinheitQuery(einsatzId, einheitId))) as Result<PsaProfilZuweisungReadRow[]>;
    if (queryResult.isFailure || !queryResult.value) {
      this.logger.warn('PSA-Toggle erfolgreich, aber Read-Refetch der aktiven Profile fehlgeschlagen', { einsatzId, einheitId, error: queryResult.error });
      // Fallback: synthetische DTO-Liste aus dem Handler-Snapshot. Audit-Daten
      // sind im Outbox-Event korrekt persistiert; Frontend-Hook refetcht ohnehin
      // sofort. Wir übernehmen `callerUserId` und `begruendung` aus dem Request,
      // damit die Zwischen-Anzeige nicht mit leeren CUIDs / leerem Text rendert
      // (Code-Review P-13). `gueltigVon` bleibt synthetisch — markiert über das
      // `partial: true`-Flag im Logger-Warn, sodass Telemetrie-Konsumenten den
      // Fallback erkennen können.
      const now = new Date().toISOString();
      // Scope auf die angefragte Einheit — wichtig im Bulk-Pfad
      // (`fetchAffectedBulk`), wo `result.affectedZuweisungen` Einträge aus
      // **allen** Einheiten enthält. Im Single-Pfad ist es ein No-Op-Filter.
      // Wir übernehmen ALLE mutierten Einträge der Einheit (AKTIVIERT +
      // DEAKTIVIERT). Für DEAKTIVIERT-Einträge setzen wir `gueltigBis = now`,
      // damit das Frontend den Mutation-Erfolg auch ohne erfolgreichen
      // Refetch erkennt (sonst wäre `affected = []` für reine Deactivate-
      // Operationen und der UI-State entgleist).
      return result.affectedZuweisungen
        .filter((entry) => entry.einheitId === einheitId)
        .map((entry) => ({
          id: entry.zuweisungId,
          einsatzId,
          einheitId: entry.einheitId,
          profil: entry.profil,
          gueltigVon: now,
          gueltigBis: entry.aktion === 'DEAKTIVIERT' ? now : null,
          aktiviertVonUserId: callerUserId,
          begruendung,
          propagationGroupId: result.propagationGroupId,
          version: entry.version,
          aktion: entry.aktion,
        }));
    }
    // AC4: Frontend braucht je Eintrag die Mutationsklasse. Refetch liefert nur
    // aktuell aktive Rows (`gueltigBis === null` ⇒ `AKTIVIERT`). Reine
    // DEAKTIVIERT-Mutationen tauchen im Refetch-Pfad nicht mehr auf — wir
    // ergänzen sie aus `result.affectedZuweisungen`, damit das Response-Array
    // alle durch diese Operation ausgelösten Wechsel der Einheit enthält.
    const refetched: PsaProfilZuweisungDto[] = queryResult.value.map(toPsaProfilZuweisungDto);
    const refetchedZuweisungIds = new Set(refetched.map((row) => row.id));
    const now = new Date().toISOString();
    const missingDeactivations = result.affectedZuweisungen
      .filter((entry) => entry.einheitId === einheitId && entry.aktion === 'DEAKTIVIERT' && !refetchedZuweisungIds.has(entry.zuweisungId))
      .map<PsaProfilZuweisungDto>((entry) => ({
        id: entry.zuweisungId,
        einsatzId,
        einheitId: entry.einheitId,
        profil: entry.profil,
        gueltigVon: now,
        gueltigBis: now,
        aktiviertVonUserId: callerUserId,
        begruendung,
        propagationGroupId: result.propagationGroupId,
        version: entry.version,
        aktion: 'DEAKTIVIERT',
      }));
    return [...refetched, ...missingDeactivations];
  }

  private mapMutationError(
    error: string,
    attemptedVersionFor: (profilHint?: string) => number | undefined,
  ): ConflictException | NotFoundException | UnprocessableEntityException | InternalServerErrorException {
    if (error.startsWith('ConflictDetected:DuplicateActivePsaProfilZuweisung')) {
      const { einheitId, profil, zuweisungId } = parseConflictAnnotations(error);
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'ConflictDetected:DuplicateActivePsaProfilZuweisung',
        context: { rule: 'DuplicateActiveProfile', einheitId, profil, zuweisungId },
      });
    }
    if (error.startsWith(PSA_PROFIL_CONFLICT_DETECTED)) {
      // Story 3.2 (AC5) + Story 3.9 (AC1): Sentinel kann mehrere
      // `key=value`-Suffixe tragen (`current=`, `einheit=`, `profil=`,
      // `zuweisungId=`) — Reihenfolge ist nicht verbindlich.
      const currentMatch = error.match(/:current=(\d+)(?:$|:)/);
      const parsed = currentMatch?.[1] !== undefined ? Number.parseInt(currentMatch[1], 10) : undefined;
      const currentVersion = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
      const { einheitId, profil, zuweisungId } = parseConflictAnnotations(error);
      // E11: `attemptedVersion` an das konkret konfliktierende Profil binden,
      // damit der UI-Banner nicht aus Versehen die `expectedVersion` eines
      // fremden Toggles als „erwartet" rendert.
      const attemptedVersion = attemptedVersionFor(profil);
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: PSA_PROFIL_CONFLICT_DETECTED,
        context: { currentVersion, attemptedVersion, einheitId, profil, zuweisungId },
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
      return new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error,
        context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' },
      });
    }
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected PSA-Profil mutation error', { errorCategory });
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
      context: { rule: 'Unexpected' },
    });
  }

  private mapQueryError(error: string): ConflictException | NotFoundException | UnprocessableEntityException | InternalServerErrorException {
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
    if (error.startsWith('ConflictDetected:')) {
      return new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: error,
        context: { rule: error.slice('ConflictDetected:'.length) },
      });
    }
    return new InternalServerErrorException({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error,
    });
  }
}

function toPsaProfilZuweisungDto(row: PsaProfilZuweisungReadRow): PsaProfilZuweisungDto {
  return {
    id: row.id,
    einsatzId: row.einsatzId,
    einheitId: row.einheitId,
    profil: row.profil,
    gueltigVon: row.gueltigVon.toISOString(),
    gueltigBis: row.gueltigBis ? row.gueltigBis.toISOString() : null,
    aktiviertVonUserId: row.aktiviertVonUserId,
    begruendung: row.begruendung,
    propagationGroupId: row.propagationGroupId,
    version: row.version,
    aktion: row.gueltigBis === null ? 'AKTIVIERT' : 'DEAKTIVIERT',
  };
}

/**
 * Liefert eine `attemptedVersion` für den HTTP-409-Context. Bei Single-Toggle-
 * Commands ist das die gesetzte `expectedVersion`. Bei Multi-Toggle-Commands
 * binden wir die Version an das konfliktierende Profil aus dem Sentinel-
 * Suffix (`:profil=<P>`), damit der Frontend-Banner nicht aus Versehen die
 * `expectedVersion` eines fremden Toggles als „erwartet" anzeigt — das war
 * die Cross-Profil-Verwischung im Code-Review-Finding E11.
 *
 * Fallback (kein `profilHint` im Sentinel): einzige distincte Version oder
 * `undefined`, wenn die Toggles unterschiedliche Versionen tragen — gleiche
 * Semantik wie zuvor (P-7).
 */
function extractAttemptedVersion(body: ChangePsaProfilDto | BulkChangePsaProfilDto, profilHint?: string): number | undefined {
  if (profilHint) {
    const matched = body.profilToggles.find((t) => t.profil === profilHint);
    return typeof matched?.expectedVersion === 'number' ? matched.expectedVersion : undefined;
  }
  const versions = body.profilToggles.map((t) => t.expectedVersion).filter((v): v is number => typeof v === 'number');
  if (versions.length === 0) return undefined;
  const distinct = new Set(versions);
  return distinct.size === 1 ? versions[0] : undefined;
}

/**
 * Parsed die Story-3.2-Sentinel-Suffixe `:einheit=<id>` / `:profil=<p>` und
 * den Story-3.9-Suffix `:zuweisungId=<id>` aus einem Conflict-String.
 * Reihenfolge ist nicht verbindlich; fehlende Schlüssel liefern `undefined`.
 * Die Werte landen als `context.einheitId` / `context.profil` /
 * `context.zuweisungId` im 409-Response-Body, damit der Frontend-Banner die
 * konfliktierende Einheit/Profil-Kombination identifizieren (AC6) und der
 * Sync-Conflict-Folgecall die Verlierer-Row referenzieren kann (Story 3.9 AC1).
 */
function parseConflictAnnotations(error: string): { einheitId?: string; profil?: string; zuweisungId?: string } {
  // einheit-Wert ist eine CUID — die ist alphanumerisch, hat keine Doppelpunkte.
  const einheitMatch = error.match(/:einheit=([^:]+)/);
  // profil-Wert ist ein PsaProfil-Enum — UPPERCASE + Underscore.
  const profilMatch = error.match(/:profil=([A-Z_]+)/);
  // zuweisungId ist eine cuid2 (lowercase a-z + 0-9, keine Doppelpunkte).
  const zuweisungMatch = error.match(/:zuweisungId=([a-z0-9]+)(?:$|:)/);
  return {
    einheitId: einheitMatch?.[1],
    profil: profilMatch?.[1],
    zuweisungId: zuweisungMatch?.[1],
  };
}
