import { ErstelleAlarmierungCommand, ErstelleAlarmierungHandler, type ErstelleAlarmierungEmpfaengerInput } from '@/application/alarmierung/commands/erstelle-alarmierung';
import { ErstelleNachalarmierungCommand, ErstelleNachalarmierungHandler } from '@/application/alarmierung/commands/erstelle-nachalarmierung';
import { SchliesseAlarmierungAbCommand, SchliesseAlarmierungAbHandler } from '@/application/alarmierung/commands/schliesse-alarmierung-ab';
import {
  AlarmierungResponseDto,
  AlarmierungTimelineEventDto,
  ApiAlarmierungEmpfaengerExtraModels,
  CreateAlarmierungDto,
  ErstelleNachalarmierungDto,
  ListAlarmierungenQueryDto,
  SchliesseAlarmierungAbDto,
  type AlarmierungEmpfaengerInputDto,
} from '@/application/alarmierung/dto';
import { GetAlarmierungByIdQuery, GetAlarmierungByIdQueryHandler } from '@/application/alarmierung/queries/get-alarmierung-by-id';
import { GetAlarmierungTimelineQuery, GetAlarmierungTimelineQueryHandler } from '@/application/alarmierung/queries/get-alarmierung-timeline';
import { ListAlarmierungenQuery, ListAlarmierungenQueryHandler } from '@/application/alarmierung/queries/list-alarmierungen';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AlarmierungMapper } from './mappers/alarmierung.mapper';
import { unwrapOrThrow } from './helpers/alarmierung-error.helper';
import { toOptionalDate } from './helpers/date-parse.helper';

/**
 * HTTP-Adapter für den Alarmierung-Bounded-Context (Issue #408).
 *
 * Alle Endpoints liegen unter `/einsatz/:einsatzId/alarmierungen`, um die
 * Einsatz-Nesting-Konvention einzuhalten.
 *
 * Wichtig: Die Route `/timeline` MUSS vor `/:alarmierungId` deklariert sein,
 * weil NestJS Routen in Deklarations-Reihenfolge matcht — sonst würde
 * "timeline" als AlarmierungId interpretiert.
 */
@ApiTags('alarmierung')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiAlarmierungEmpfaengerExtraModels()
@Controller({ path: 'einsatz/:einsatzId/alarmierungen', version: 'alpha' })
export class AlarmierungController {
  constructor(
    private readonly erstelleHandler: ErstelleAlarmierungHandler,
    private readonly erstelleNachalarmierungHandler: ErstelleNachalarmierungHandler,
    private readonly schliesseAbHandler: SchliesseAlarmierungAbHandler,
    private readonly listHandler: ListAlarmierungenQueryHandler,
    private readonly getByIdHandler: GetAlarmierungByIdQueryHandler,
    private readonly getTimelineHandler: GetAlarmierungTimelineQueryHandler,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Alarmierungen des Einsatzes auflisten (Filter: status, Pagination)' })
  @ApiWrappedResponse(AlarmierungResponseDto, { isArray: true, description: 'Alle Alarmierungen des Einsatzes (neueste zuerst)' })
  async list(@Param('einsatzId') einsatzId: string, @Query(new ValidationPipe({ transform: true, whitelist: true })) filter: ListAlarmierungenQueryDto): Promise<AlarmierungResponseDto[]> {
    const query = unwrapOrThrow(
      ListAlarmierungenQuery.create({
        einsatzId,
        status: filter.status,
        skip: filter.skip,
        take: filter.take,
      }),
    );
    const aggregates = unwrapOrThrow(await this.listHandler.execute(query));
    return aggregates.map((a) => AlarmierungMapper.toResponseDto(a));
  }

  @Post()
  @ApiOperation({ summary: 'Neue Alarmierung auslösen' })
  @ApiWrappedCreatedResponse(AlarmierungResponseDto, { description: 'Alarmierung erzeugt' })
  async create(
    @Param('einsatzId') einsatzId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateAlarmierungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<AlarmierungResponseDto> {
    const command = unwrapOrThrow(
      ErstelleAlarmierungCommand.create({
        einsatzId,
        bezeichnung: dto.bezeichnung,
        beschreibung: dto.beschreibung,
        alarmierungszeit: toOptionalDate(dto.alarmierungszeit),
        empfaenger: dto.empfaenger.map(toEmpfaengerInput),
        createdBy: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.erstelleHandler.execute(command));
    return AlarmierungMapper.toResponseDto(aggregate);
  }

  // WICHTIG: `/timeline` MUSS VOR `/:alarmierungId` stehen — sonst matcht Nest
  // den statischen Pfad als Parameter.
  @Get('timeline')
  @ApiOperation({ summary: 'Chronologische Alarmierungs-Timeline eines Einsatzes' })
  @ApiWrappedResponse(AlarmierungTimelineEventDto, { isArray: true, description: 'Alle Alarmierungs-Events (chronologisch aufsteigend)' })
  async timeline(@Param('einsatzId') einsatzId: string): Promise<AlarmierungTimelineEventDto[]> {
    const query = unwrapOrThrow(GetAlarmierungTimelineQuery.create({ einsatzId }));
    const items = unwrapOrThrow(await this.getTimelineHandler.execute(query));
    return items.map((i) => AlarmierungMapper.toTimelineEventDto(i));
  }

  @Get(':alarmierungId')
  @ApiOperation({ summary: 'Einzelne Alarmierung laden' })
  @ApiWrappedResponse(AlarmierungResponseDto, { description: 'Alarmierung inkl. Empfänger' })
  @ApiNotFoundResponse({ description: 'Alarmierung nicht gefunden' })
  async getById(@Param('einsatzId') einsatzId: string, @Param('alarmierungId') alarmierungId: string): Promise<AlarmierungResponseDto> {
    const query = unwrapOrThrow(GetAlarmierungByIdQuery.create({ einsatzId, alarmierungId }));
    const aggregate = unwrapOrThrow(await this.getByIdHandler.execute(query));
    if (!aggregate) {
      throw new NotFoundException(`Alarmierung ${alarmierungId} nicht gefunden`);
    }
    return AlarmierungMapper.toResponseDto(aggregate);
  }

  @Post(':alarmierungId/abschliessen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Alarmierung abschließen' })
  @ApiWrappedResponse(AlarmierungResponseDto, { description: 'Abgeschlossene Alarmierung' })
  async abschliessen(
    @Param('einsatzId') _einsatzId: string,
    @Param('alarmierungId') alarmierungId: string,
    // DTO aktuell ohne Pflichtfelder — akzeptiert auch leeren Body.
    @Body(new ValidationPipe({ transform: true, whitelist: true })) _dto: SchliesseAlarmierungAbDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<AlarmierungResponseDto> {
    const command = unwrapOrThrow(
      SchliesseAlarmierungAbCommand.create({
        alarmierungId,
        updatedBy: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.schliesseAbHandler.execute(command));
    return AlarmierungMapper.toResponseDto(aggregate);
  }

  @Post(':alarmierungId/nachalarmierung')
  @ApiOperation({ summary: 'Nachalarmierung zu einer bestehenden Alarmierung anlegen' })
  @ApiWrappedCreatedResponse(AlarmierungResponseDto, { description: 'Nachalarmierung erzeugt' })
  async erstelleNachalarmierung(
    @Param('einsatzId') einsatzId: string,
    @Param('alarmierungId') ursprungAlarmierungId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: ErstelleNachalarmierungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<AlarmierungResponseDto> {
    const command = unwrapOrThrow(
      ErstelleNachalarmierungCommand.create({
        einsatzId,
        ursprungAlarmierungId,
        bezeichnung: dto.bezeichnung,
        beschreibung: dto.beschreibung,
        alarmierungszeit: toOptionalDate(dto.alarmierungszeit),
        empfaenger: dto.empfaenger.map(toEmpfaengerInput),
        createdBy: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.erstelleNachalarmierungHandler.execute(command));
    return AlarmierungMapper.toResponseDto(aggregate);
  }
}

/**
 * Übersetzt einen DTO-Empfänger in die Domain-Input-Form.
 *
 * Die Typen sind strukturell identisch, aber getrennt — der DTO stammt aus der
 * HTTP-Schicht, das Command-Input ist bewusst entkoppelt.
 */
function toEmpfaengerInput(dto: AlarmierungEmpfaengerInputDto): ErstelleAlarmierungEmpfaengerInput {
  switch (dto.kind) {
    case 'fahrzeug':
      return {
        kind: 'fahrzeug',
        fahrzeugId: dto.fahrzeugId,
        nameSnapshot: dto.nameSnapshot,
        alarmiertAm: toOptionalDate(dto.alarmiertAm),
      };
    case 'person':
      return {
        kind: 'person',
        personId: dto.personId,
        nameSnapshot: dto.nameSnapshot,
        alarmiertAm: toOptionalDate(dto.alarmiertAm),
      };
    case 'einheit':
      return {
        kind: 'einheit',
        einheitId: dto.einheitId,
        nameSnapshot: dto.nameSnapshot,
        alarmiertAm: toOptionalDate(dto.alarmiertAm),
      };
  }
}
