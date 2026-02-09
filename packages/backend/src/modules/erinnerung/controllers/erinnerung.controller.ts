import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import {
  AssignErinnerungDto,
  CreateErinnerungDto,
  UpdateErinnerungDto,
  ErinnerungResponseDto,
  ErinnerungStatistikDto,
  PersonStatistikDto,
  ZeitverlaufStatistikDto,
} from '@/application/erinnerung/dto';
import { CreateErinnerungCommand } from '@/application/erinnerung/commands/create-erinnerung/create-erinnerung.command';
import { CreateErinnerungHandler } from '@/application/erinnerung/commands/create-erinnerung/create-erinnerung.handler';
import { UpdateErinnerungCommand } from '@/application/erinnerung/commands/update-erinnerung/update-erinnerung.command';
import { UpdateErinnerungHandler } from '@/application/erinnerung/commands/update-erinnerung/update-erinnerung.handler';
import { DeleteErinnerungCommand } from '@/application/erinnerung/commands/delete-erinnerung/delete-erinnerung.command';
import { DeleteErinnerungHandler } from '@/application/erinnerung/commands/delete-erinnerung/delete-erinnerung.handler';
import { TriggerErinnerungCommand } from '@/application/erinnerung/commands/trigger-erinnerung/trigger-erinnerung.command';
import { TriggerErinnerungHandler } from '@/application/erinnerung/commands/trigger-erinnerung/trigger-erinnerung.handler';
import { AcknowledgeErinnerungCommand } from '@/application/erinnerung/commands/acknowledge-erinnerung/acknowledge-erinnerung.command';
import { AcknowledgeErinnerungHandler } from '@/application/erinnerung/commands/acknowledge-erinnerung/acknowledge-erinnerung.handler';
import { SnoozeErinnerungCommand } from '@/application/erinnerung/commands/snooze-erinnerung/snooze-erinnerung.command';
import { SnoozeErinnerungHandler } from '@/application/erinnerung/commands/snooze-erinnerung/snooze-erinnerung.handler';
import { MarkErledigtErinnerungCommand } from '@/application/erinnerung/commands/mark-erledigt-erinnerung/mark-erledigt-erinnerung.command';
import { MarkErledigtErinnerungHandler } from '@/application/erinnerung/commands/mark-erledigt-erinnerung/mark-erledigt-erinnerung.handler';
import { AssignErinnerungCommand } from '@/application/erinnerung/commands/assign-erinnerung/assign-erinnerung.command';
import { AssignErinnerungHandler } from '@/application/erinnerung/commands/assign-erinnerung/assign-erinnerung.handler';
import { SnoozeErinnerungDto } from '@/application/erinnerung/dto/snooze-erinnerung.dto';
import { MarkErledigtErinnerungDto } from '@/application/erinnerung/dto/mark-erledigt-erinnerung.dto';
import { GetErinnerungenByEinsatzQuery } from '@/application/erinnerung/queries/get-erinnerungen-by-einsatz/get-erinnerungen-by-einsatz.query';
import { GetErinnerungenByEinsatzHandler } from '@/application/erinnerung/queries/get-erinnerungen-by-einsatz/get-erinnerungen-by-einsatz.handler';
import { ERINNERUNG_ERROR_CODES } from '@/application/erinnerung/errors/erinnerung-error.codes';
import { GetErinnerungStatistikHandler } from '@/application/erinnerung/queries/get-erinnerung-statistik/get-erinnerung-statistik.handler';
import { GetErinnerungStatistikQuery } from '@/application/erinnerung/queries/get-erinnerung-statistik/get-erinnerung-statistik.query';
import { GetPersonStatistikHandler } from '@/application/erinnerung/queries/get-person-statistik/get-person-statistik.handler';
import { GetPersonStatistikQuery } from '@/application/erinnerung/queries/get-person-statistik/get-person-statistik.query';
import { GetEtbEntriesByErinnerungHandler } from '@/application/erinnerung/queries/get-etb-entries-by-erinnerung/get-etb-entries-by-erinnerung.handler';
import { GetEtbEntriesByErinnerungQuery } from '@/application/erinnerung/queries/get-etb-entries-by-erinnerung/get-etb-entries-by-erinnerung.query';
import { GetZeitverlaufStatistikHandler } from '@/application/erinnerung/queries/get-zeitverlauf-statistik/get-zeitverlauf-statistik.handler';
import { GetZeitverlaufStatistikQuery } from '@/application/erinnerung/queries/get-zeitverlauf-statistik/get-zeitverlauf-statistik.query';
import { ErinnerungEtbHistoryDto } from '@/application/erinnerung/dto/erinnerung-etb-history.dto';
import { StopRecurringSeriesCommand } from '@/application/erinnerung/commands/stop-recurring-series/stop-recurring-series.command';
import { StopRecurringSeriesHandler } from '@/application/erinnerung/commands/stop-recurring-series/stop-recurring-series.handler';
import { StopRecurringSeriesDto } from '@/application/erinnerung/dto/stop-recurring-series.dto';

/**
 * Controller für Erinnerungen innerhalb eines Einsatzes.
 *
 * Ermöglicht das Erstellen und Abrufen von Erinnerungen.
 * Erinnerungen sind immer an einen Einsatz gebunden.
 *
 * **Story 1.1 Features:**
 * - Quick-Create: Erinnerung mit Titel und Zeitpunkt in unter 10 Sekunden anlegen
 * - Zeit-Presets: 5, 10, 15, 30, 60 Minuten
 * - Status: Wird initial als GEPLANT erstellt
 */
@ApiTags('Erinnerungen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@Controller({
  path: 'einsatz/:einsatzId/erinnerungen',
  version: 'alpha',
})
export class ErinnerungController {
  constructor(
    private readonly createHandler: CreateErinnerungHandler,
    private readonly updateHandler: UpdateErinnerungHandler,
    private readonly deleteHandler: DeleteErinnerungHandler,
    private readonly triggerHandler: TriggerErinnerungHandler,
    private readonly acknowledgeHandler: AcknowledgeErinnerungHandler,
    private readonly snoozeHandler: SnoozeErinnerungHandler,
    private readonly markErledigtHandler: MarkErledigtErinnerungHandler,
    private readonly assignHandler: AssignErinnerungHandler,
    private readonly getByEinsatzHandler: GetErinnerungenByEinsatzHandler,
    private readonly getStatistikHandler: GetErinnerungStatistikHandler,
    private readonly getPersonStatistikHandler: GetPersonStatistikHandler,
    private readonly getEtbHistoryHandler: GetEtbEntriesByErinnerungHandler,
    private readonly stopRecurringSeriesHandler: StopRecurringSeriesHandler,
    private readonly getZeitverlaufStatistikHandler: GetZeitverlaufStatistikHandler,
  ) {}

  /**
   * Alle Erinnerungen eines Einsatzes abrufen.
   *
   * Gibt die Liste aller Erinnerungen sortiert nach Fälligkeit zurück.
   * Wird für die Erinnerungsliste im Einsatz-Kontext verwendet.
   *
   * **Pagination Policy:**
   * Keine Pagination - Erinnerungen pro Einsatz sind typischerweise < 50 Einträge.
   * Bei Bedarf für größere Listen: Pagination via @ApiWrappedResponse({ pagination: true }) hinzufügen.
   *
   * **Story 1.1 AC2:** "die Erinnerung erscheint in meiner Liste"
   */
  @Get()
  @ApiOperation({
    summary: 'Alle Erinnerungen eines Einsatzes abrufen',
    description: 'Gibt alle Erinnerungen des Einsatzes sortiert nach Fälligkeit (aufsteigend) zurück. Keine Pagination (max ~50 pro Einsatz).',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    isArray: true,
    description: 'Liste aller Erinnerungen (keine Pagination - max ~50 pro Einsatz)',
  })
  @ApiBadRequestResponse({ description: 'Ungültige EinsatzId' })
  async getByEinsatz(@Param('einsatzId') einsatzId: string): Promise<ErinnerungResponseDto[]> {
    const queryResult = GetErinnerungenByEinsatzQuery.create({ einsatzId });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getByEinsatzHandler.execute(queryResult.value);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value ?? [];
  }

  /**
   * Erinnerungs-Statistiken abrufen.
   *
   * Liefert KPIs zu eskalierten Erinnerungen und Status-Uebersicht im Einsatz.
   *
   * **Story 4.9 ACs:**
   * - Total Escalated
   * - Avg Escalation Time
   * - Top Receivers
   *
   * **Story 9.1 ACs:**
   * - Status Counts (Anzahl Erinnerungen pro Status)
   * - Active Count (nicht erledigte Erinnerungen)
   */
  @Get('statistik')
  @ApiOperation({
    summary: 'Erinnerungs-Statistiken abrufen',
    description: 'Liefert Statistiken zu Erinnerungen: Eskalation (Anzahl, Dauer, Top-Empfänger) und Status-Counts.',
  })
  @ApiWrappedResponse(ErinnerungStatistikDto, {
    description: 'Eskalations-Statistiken erfolgreich abgerufen',
  })
  @ApiBadRequestResponse({ description: 'Ungültige EinsatzId' })
  async getStatistik(@Param('einsatzId') einsatzId: string): Promise<ErinnerungStatistikDto> {
    const queryResult = GetErinnerungStatistikQuery.create({ einsatzId });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getStatistikHandler.execute(queryResult.value);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    // biome-ignore lint/style/noNonNullAssertion: Result pattern - value is guaranteed after isFailure check
    return result.value!;
  }

  /**
   * Personen-Statistiken abrufen.
   *
   * Liefert Statistiken pro Teilnehmer: Zugewiesen, Acknowledged, Eskalationen, Avg Reaktionszeit.
   *
   * **Story 9.2 ACs:**
   * - AC1: Pro Teilnehmer: Zugewiesen, Acknowledged, Eskalationen, Avg Reaktionszeit
   * - AC2: Teilnehmer ohne Erinnerungen werden mit 0-Werten angezeigt
   */
  @Get('statistik/personen')
  @ApiOperation({
    summary: 'Personen-Statistiken abrufen',
    description: 'Liefert Statistiken pro Teilnehmer: Zugewiesene Erinnerungen, Acknowledges, Eskalationen und durchschnittliche Reaktionszeit.',
  })
  @ApiWrappedResponse(PersonStatistikDto, {
    description: 'Personen-Statistiken erfolgreich abgerufen',
  })
  @ApiBadRequestResponse({ description: 'Ungültige EinsatzId' })
  async getPersonStatistik(@Param('einsatzId') einsatzId: string): Promise<PersonStatistikDto> {
    const queryResult = GetPersonStatistikQuery.create({ einsatzId });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getPersonStatistikHandler.execute(queryResult.value);

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    // biome-ignore lint/style/noNonNullAssertion: Result pattern - value is guaranteed after isFailure check
    return result.value!;
  }

  /**
   * Zeitverlauf-Statistiken abrufen.
   *
   * Liefert ein Zeitreihen-Diagramm mit Erstellt/Ausgelöst/Eskaliert pro Zeitintervall.
   *
   * **Story 9.3 ACs:**
   * - AC1: Area-/Liniendiagramm mit Zeitachse (X) und Anzahl (Y)
   * - AC2: Automatische Zeitintervalle je nach Einsatzdauer
   */
  @Get('statistik/zeitverlauf')
  @ApiOperation({
    summary: 'Zeitverlauf-Statistiken abrufen',
    description: 'Liefert Zeitreihen-Daten: Erstellte, ausgelöste und eskalierte Erinnerungen pro Zeitintervall.',
  })
  @ApiWrappedResponse(ZeitverlaufStatistikDto, {
    description: 'Zeitverlauf-Statistiken erfolgreich abgerufen',
  })
  @ApiBadRequestResponse({ description: 'Ungültige EinsatzId' })
  async getZeitverlaufStatistik(@Param('einsatzId') einsatzId: string): Promise<ZeitverlaufStatistikDto> {
    const queryResult = GetZeitverlaufStatistikQuery.create({ einsatzId });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }

    const result = await this.getZeitverlaufStatistikHandler.execute(queryResult.value);

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    // biome-ignore lint/style/noNonNullAssertion: Result pattern - value is guaranteed after isFailure check
    return result.value!;
  }

  /**
   * Neue Erinnerung erstellen (Quick-Create).
   *
   * Erstellt eine Erinnerung mit dem angegebenen Titel und Zeitpunkt.
   * Der Status wird automatisch auf GEPLANT gesetzt.
   *
   * **Story 1.1 AC2:**
   * - Erinnerung wird mit Status GEPLANT erstellt
   * - Visuelles Feedback bestätigt Erstellung
   */
  @Post()
  @ApiOperation({
    summary: 'Neue Erinnerung erstellen',
    description: 'Erstellt eine neue Erinnerung mit Titel und Fälligkeitszeitpunkt. Status wird auf GEPLANT gesetzt.',
  })
  @ApiWrappedCreatedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich erstellt',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async create(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateErinnerungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = CreateErinnerungCommand.create({
      einsatzId,
      titel: dto.titel,
      beschreibung: dto.beschreibung,
      faelligAm: new Date(dto.faelligAm),
      erstelltVon: user.userId,
      requiresNote: dto.requiresNote,
      assignedToId: dto.assignedToId, // Story 3.3: Zuweisung bei Erstellung
      eskalationsPersonId: dto.eskalationsPersonId, // Story 4.1: Eskalationsperson
      eskalationNurAnErsteller: dto.eskalationNurAnErsteller, // Story 4.10: Eskalations-Restriktion
      etbEntryId: dto.etbEntryId, // Story 5.4: ETB-Eintrag Referenz
      isRecurring: dto.isRecurring, // Story 6.4: Wiederkehrende Erinnerungen
      recurringIntervalMinutes: dto.recurringIntervalMinutes, // Story 6.4
      recurringEndDate: dto.recurringEndDate ? new Date(dto.recurringEndDate) : undefined, // Story 6.4
      recurringMaxCount: dto.recurringMaxCount, // Story 6.4
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.createHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Story 3.3: Ungültiger Teilnehmer → 400 Bad Request
      if (result.error === ERINNERUNG_ERROR_CODES.INVALID_ASSIGNED_TO) {
        throw new BadRequestException('Ungültiger Teilnehmer');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht erstellt werden');
    }

    return result.value;
  }

  /**
   * Aktualisiert eine bestehende Erinnerung.
   *
   * Nur Erinnerungen im Status GEPLANT können bearbeitet werden, da
   * bereits ausgelöste oder abgeschlossene Erinnerungen historische
   * Fakten darstellen und nicht nachträglich verändert werden dürfen.
   *
   * **Story 1.3 AC2:**
   * - Änderungen werden gespeichert
   * - Bei Zeit-Änderung: Timer wird neu berechnet
   * - WebSocket-Event `erinnerung.updated` wird gesendet
   *
   * **Story 1.3 AC3:**
   * - Nur Erinnerungen im Status GEPLANT können bearbeitet werden
   * - Andere Status: 409 Conflict
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Erinnerung aktualisieren',
    description: 'Aktualisiert eine bestehende Erinnerung. Nur Erinnerungen im Status GEPLANT können bearbeitet werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich aktualisiert',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten oder keine Änderungen angegeben' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht bearbeitet werden (Status ist nicht GEPLANT)' })
  async update(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateErinnerungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = UpdateErinnerungCommand.create({
      erinnerungId: id,
      aktualisierVon: user.userId,
      titel: dto.titel,
      beschreibung: dto.beschreibung,
      faelligAm: dto.faelligAm ? new Date(dto.faelligAm) : undefined,
      eskalationsPersonId: dto.eskalationsPersonId, // Story 4.1: Eskalationsperson aktualisieren
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.updateHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_EDITABLE → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_EDITABLE) {
        throw new ConflictException('Nur geplante Erinnerungen können bearbeitet werden');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht aktualisiert werden');
    }

    return result.value;
  }

  /**
   * Loest eine Erinnerung manuell aus.
   *
   * Setzt den Status auf AUSGELOEST und speichert den Auslösezeitpunkt.
   * Nur Erinnerungen im Status GEPLANT können ausgelöst werden.
   *
   * **Story 1.5 ACs:**
   * - AC1: Status wechselt zu AUSGELOEST
   * - AC4: WebSocket Event 'erinnerung.triggered' wird emittiert
   * - AC5: ETB-Eintrag wird automatisch erstellt (via Event Handler)
   *
   * **Trigger-Szenarien:**
   * - Timer-basiert: Client löst bei Erreichen von faelligAm aus
   * - Manuell: User kann Erinnerung vorzeitig auslösen
   */
  @Post(':id/trigger')
  @ApiOperation({
    summary: 'Erinnerung ausloesen',
    description: 'Löst eine Erinnerung aus (Status → AUSGELOEST). Nur Erinnerungen im Status GEPLANT können ausgelöst werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich ausgelöst',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht ausgelöst werden (Status ist nicht GEPLANT)' })
  async trigger(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = TriggerErinnerungCommand.create({
      erinnerungId: id,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.triggerHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_TRIGGERABLE → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_TRIGGERABLE) {
        throw new ConflictException('Nur geplante Erinnerungen können ausgelöst werden');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht ausgelöst werden');
    }

    return result.value;
  }

  /**
   * Bestaetigt eine ausgeloeste Erinnerung (1-Tap Acknowledge).
   *
   * Setzt den Status auf ACKNOWLEDGED und stoppt den Audio-Alarm.
   * Nur Erinnerungen im Status AUSGELOEST können bestätigt werden.
   *
   * **Story 1.6 ACs:**
   * - AC1: Nur AUSGELOEST Status kann acknowledged werden
   * - AC2: Status wechselt zu ACKNOWLEDGED
   * - AC3: Audio-Alarm wird gestoppt (via WebSocket Event)
   * - AC4: WebSocket Event 'erinnerung.acknowledged' wird emittiert
   * - AC5: ETB-Eintrag wird automatisch erstellt (via Event Handler)
   */
  @Post(':id/acknowledge')
  @ApiOperation({
    summary: 'Erinnerung bestaetigen',
    description: 'Bestätigt eine ausgelöste Erinnerung (Status → ACKNOWLEDGED). Nur Erinnerungen im Status AUSGELOEST können bestätigt werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich bestätigt',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId oder UserId' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht bestätigt werden (Status ist nicht AUSGELOEST)' })
  async acknowledge(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = AcknowledgeErinnerungCommand.create({
      erinnerungId: id,
      acknowledgedBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.acknowledgeHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_ACKNOWLEDGEABLE → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_ACKNOWLEDGEABLE) {
        throw new ConflictException('Nur ausgelöste Erinnerungen können bestätigt werden');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht bestätigt werden');
    }

    return result.value;
  }

  /**
   * Snoozed eine ausgeloeste Erinnerung mit Preset-Zeit.
   *
   * Verschiebt eine ausgeloeste Erinnerung um die angegebene Zeit (1, 5, 10 Minuten).
   * Nur Erinnerungen im Status AUSGELOEST können gesnoozed werden.
   *
   * **Story 2.1 ACs:**
   * - AC1: Preset-Zeiten 1, 5, 10 Minuten (Escape = 5 Min im Frontend)
   * - AC2: Status wechselt zu SNOOZED, neue Fälligkeit wird berechnet
   * - AC3: Audio-Alarm wird im Frontend gestoppt (via WebSocket Event)
   * - ETB-Eintrag wird automatisch erstellt (via Event Handler)
   */
  @Post(':id/snooze')
  @ApiOperation({
    summary: 'Erinnerung snoozen',
    description: 'Snoozed eine ausgelöste Erinnerung (Status → SNOOZED). Nur Erinnerungen im Status AUSGELOEST können gesnoozed werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich gesnoozed',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId, UserId oder snoozeMinutes' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht gesnoozed werden (Status ist nicht AUSGELOEST)' })
  async snooze(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: SnoozeErinnerungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = SnoozeErinnerungCommand.create({
      erinnerungId: id,
      snoozedBy: user.userId,
      snoozeMinutes: dto.snoozeMinutes,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.snoozeHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_SNOOZEABLE → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_SNOOZEABLE) {
        throw new ConflictException('Nur ausgelöste Erinnerungen können gesnoozed werden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.SNOOZE_MINUTES_INVALID) {
        throw new BadRequestException('snoozeMinutes muss 1, 5 oder 10 sein');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht gesnoozed werden');
    }

    return result.value;
  }

  /**
   * Markiert eine Erinnerung als erledigt.
   *
   * Setzt den Status auf ERLEDIGT mit optionaler Erledigungs-Notiz.
   * Nur Erinnerungen im Status ACKNOWLEDGED oder ESKALIERT können erledigt werden.
   *
   * **Story 2.5 ACs:**
   * - AC1: Nur Erinnerungen mit Status ACKNOWLEDGED oder ESKALIERT können erledigt werden
   * - AC2: Optionale Notiz (max 500 Zeichen)
   * - AC3: Status wechselt zu ERLEDIGT
   * - AC4: Domain Event wird publiziert für ETB-Integration
   * - AC5: Erinnerung verschwindet aus aktiver Liste (gefiltert)
   */
  @Post(':id/mark-erledigt')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Erinnerung als erledigt markieren',
    description: 'Markiert eine Erinnerung als erledigt (Status → ERLEDIGT). Nur Erinnerungen im Status ACKNOWLEDGED oder ESKALIERT können erledigt werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich als erledigt markiert',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId, UserId, Notiz zu lang oder Pflicht-Notiz fehlt (requiresNote=true)' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht erledigt werden (Status ist nicht ACKNOWLEDGED oder ESKALIERT)' })
  async markErledigt(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: MarkErledigtErinnerungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = MarkErledigtErinnerungCommand.create({
      erinnerungId: id,
      erledigtBy: user.userId,
      erledigungsNotiz: dto.erledigungsNotiz,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.markErledigtHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_COMPLETEABLE → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_COMPLETEABLE) {
        throw new ConflictException('Nur bestätigte oder eskalierte Erinnerungen können erledigt werden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOTIZ_TOO_LONG) {
        throw new BadRequestException('Erledigungs-Notiz darf maximal 500 Zeichen haben');
      }
      // Story 2.6: Pflicht-Notiz fehlt bei requiresNote=true
      // NOTE: Using 400 instead of 422 for consistency with other validation errors
      if (result.error === ERINNERUNG_ERROR_CODES.ERLEDIGUNGS_NOTIZ_REQUIRED) {
        throw new BadRequestException('Erledigungs-Notiz ist erforderlich');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht erledigt werden');
    }

    return result.value;
  }

  /**
   * Weist eine bestehende Erinnerung einem anderen Benutzer zu.
   *
   * Ermöglicht die nachträgliche Zuweisung einer Erinnerung an einen anderen
   * Einsatz-Teilnehmer. Nur aktive Erinnerungen können zugewiesen werden.
   *
   * **Story 3.4 ACs:**
   * - AC1: Bestehende Erinnerung nachträglich zuweisen, Teilnehmer erhält Notification
   * - AC2: Nach Zuweisung verschwindet Erinnerung aus "Meine Erinnerungen" des alten Besitzers
   */
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bestehende Erinnerung zuweisen',
    description: 'Weist eine bestehende Erinnerung einem anderen Benutzer zu. Nur aktive Erinnerungen (nicht ERLEDIGT/ESKALIERT) können zugewiesen werden.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Erinnerung erfolgreich zugewiesen',
  })
  @ApiBadRequestResponse({ description: 'Ungültiger Teilnehmer oder Erinnerung nicht zuweisbar' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  async assign(
    @Param('einsatzId') einsatzId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AssignErinnerungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = AssignErinnerungCommand.create({
      erinnerungId: id,
      einsatzId,
      assignedToId: dto.assignedToId,
      assignedById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.assignHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, INVALID_ASSIGNED_TO → 400, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.INVALID_ASSIGNED_TO) {
        throw new BadRequestException('Ungültiger Teilnehmer');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Erinnerung konnte nicht zugewiesen werden');
    }

    return result.value;
  }

  /**
   * Stoppt eine wiederkehrende Erinnerungs-Serie (Story 6.5).
   *
   * Setzt isRecurring auf false, sodass keine weiteren Instanzen erstellt werden.
   * Optional kann die aktuelle aktive Kind-Instanz abgebrochen werden (cancelCurrent=true).
   *
   * **Story 6.5 ACs:**
   * - AC1: Serie beenden (nur zukünftige Instanzen)
   * - AC2: Serie und aktuelle Instanz beenden
   * - AC4: Jeder Einsatzleiter darf stoppen (Einsatz-Kontext)
   */
  @Patch(':id/stop-recurring')
  @ApiOperation({
    summary: 'Wiederkehrende Serie stoppen',
    description: 'Stoppt eine wiederkehrende Serie. Keine weiteren Instanzen werden erstellt. Optional: Aktuelle Instanz abbrechen.',
  })
  @ApiWrappedResponse(ErinnerungResponseDto, {
    description: 'Wiederkehrende Serie erfolgreich gestoppt',
  })
  @ApiBadRequestResponse({ description: 'Erinnerung ist nicht wiederkehrend oder ist eine Kind-Instanz' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  async stopRecurringSeries(
    @Param('einsatzId') einsatzId: string,
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: StopRecurringSeriesDto,
  ): Promise<ErinnerungResponseDto> {
    const commandResult = StopRecurringSeriesCommand.create({
      erinnerungId: id,
      einsatzId,
      cancelCurrent: dto.cancelCurrent,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.stopRecurringSeriesHandler.execute(commandResult.value);

    if (result.isFailure) {
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_RECURRING) {
        throw new BadRequestException('Erinnerung ist nicht wiederkehrend');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.IS_CHILD_INSTANCE) {
        throw new BadRequestException('Kind-Instanzen können keine Serie stoppen');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.SERIE_ALREADY_STOPPED) {
        throw new BadRequestException('Die wiederkehrende Serie wurde bereits gestoppt');
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new BadRequestException('Serie konnte nicht gestoppt werden');
    }

    return result.value;
  }

  /**
   * Loescht eine Erinnerung (Soft-Delete).
   *
   * Nur Erinnerungen im Status GEPLANT oder AUSGELOEST können gelöscht werden.
   * Die Erinnerung wird nicht physisch gelöscht, sondern als gelöscht markiert
   * (Soft-Delete mit deletedAt und deletedBy Feldern).
   *
   * **Story 1.4 ACs:**
   * - AC1: Nur GEPLANT oder AUSGELOEST Status loeschbar
   * - AC3: Soft-Delete (nicht physisch loeschen)
   * - AC4: Domain Event wird emittiert
   * - AC5: ETB-Eintrag wird automatisch erstellt (via Event Handler)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Erinnerung loeschen',
    description: 'Loescht eine Erinnerung (Soft-Delete). Nur Erinnerungen im Status GEPLANT oder AUSGELOEST können gelöscht werden.',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId oder UserId' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden' })
  @ApiConflictResponse({ description: 'Erinnerung kann nicht gelöscht werden (Status erlaubt kein Löschen oder bereits gelöscht)' })
  async delete(
    @Param('einsatzId') _einsatzId: string, // Für URL-Struktur, nicht für Validierung genutzt
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const commandResult = DeleteErinnerungCommand.create({
      erinnerungId: id,
      geloeschtVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.deleteHandler.execute(commandResult.value);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND → 404, NOT_DELETABLE/ALREADY_DELETED → 409, sonst 400
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_FOUND) {
        throw new NotFoundException('Erinnerung nicht gefunden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.NOT_DELETABLE) {
        throw new ConflictException('Nur geplante oder ausgelöste Erinnerungen können gelöscht werden');
      }
      if (result.error === ERINNERUNG_ERROR_CODES.ALREADY_DELETED) {
        throw new ConflictException('Erinnerung wurde bereits gelöscht');
      }
      throw new BadRequestException(result.error);
    }

    // 204 No Content - kein Body
  }

  /**
   * ETB-History einer Erinnerung abrufen.
   *
   * Gibt alle ETB-Einträge zurück, die zu dieser Erinnerung gehören.
   * Die Einträge werden chronologisch sortiert (älteste zuerst).
   *
   * **Story 5.7: Bidirektionale Verknüpfung - Erinnerung zu ETB-Einträgen Query**
   * - Zeigt alle ETB-Einträge für diese Erinnerung
   * - Ermöglicht Audit-Trail und Nachvollziehbarkeit
   */
  @Get(':erinnerungId/etb-history')
  @ApiOperation({
    summary: 'ETB-History einer Erinnerung abrufen',
    description: 'Gibt alle ETB-Einträge zurück, die zu dieser Erinnerung gehören. Sortiert nach Erstellungszeitpunkt (älteste zuerst).',
  })
  @ApiWrappedResponse(ErinnerungEtbHistoryDto, {
    description: 'ETB-Historie dieser Erinnerung',
  })
  @ApiBadRequestResponse({ description: 'Ungültige ErinnerungId oder EinsatzId' })
  @ApiNotFoundResponse({ description: 'Erinnerung nicht gefunden oder gehört nicht zu diesem Einsatz' })
  async getEtbHistory(@Param('erinnerungId') erinnerungId: string, @Param('einsatzId') einsatzId: string): Promise<ErinnerungEtbHistoryDto> {
    const query = new GetEtbEntriesByErinnerungQuery(erinnerungId, einsatzId);
    const result = await this.getEtbHistoryHandler.execute(query);

    if (result.isFailure) {
      // Error Mapping: NOT_FOUND-artige Fehler → 404, DB-Fehler → 500, sonst 400
      const notFoundErrors = ['Erinnerung nicht gefunden', 'Erinnerung gehört nicht zu diesem Einsatz', 'ETB nicht gefunden'];
      if (notFoundErrors.includes(result.error ?? '')) {
        throw new NotFoundException(result.error);
      }
      if (result.error === 'Fehler beim Laden der ETB-History') {
        throw new InternalServerErrorException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    // biome-ignore lint/style/noNonNullAssertion: Result pattern - value is guaranteed after isFailure check
    return result.value!;
  }
}
