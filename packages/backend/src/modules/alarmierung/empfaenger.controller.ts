import { EntferneEmpfaengerCommand, EntferneEmpfaengerHandler } from '@/application/alarmierung/commands/entferne-empfaenger';
import { FuegeEmpfaengerHinzuCommand, FuegeEmpfaengerHinzuHandler, type FuegeEmpfaengerHinzuRef } from '@/application/alarmierung/commands/fuege-empfaenger-hinzu';
import { KorrigiereZeitpunktCommand, KorrigiereZeitpunktHandler } from '@/application/alarmierung/commands/korrigiere-zeitpunkt';
import { AlarmierungResponseDto, ApiAlarmierungEmpfaengerExtraModels, FUEGE_EMPFAENGER_HINZU_BODY_SCHEMA, type FuegeEmpfaengerHinzuDto } from '@/application/alarmierung/dto';
import { GetAlarmierungByIdQuery, GetAlarmierungByIdQueryHandler } from '@/application/alarmierung/queries/get-alarmierung-by-id';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { BadRequestException, Body, Controller, Delete, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AlarmierungMapper } from './mappers/alarmierung.mapper';
import { unwrapOrThrow } from './helpers/alarmierung-error.helper';
import type { ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import { ZEITPUNKT_FELDER } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';

/**
 * Body-DTO für `PATCH …/empfaenger/:empfaengerId/zeitpunkte`.
 *
 * Jeder Schlüssel ist optional. Für jeden mitgeschickten Schlüssel wird ein
 * separater {@link KorrigiereZeitpunktCommand} dispatcht — `null` setzt den
 * Zeitpunkt auf „nicht gesetzt" zurück.
 */
interface KorrigiereZeitpunkteBody {
  ausgeruecktAm?: string | null;
  vorOrtAm?: string | null;
  wiederFreiAm?: string | null;
}

/**
 * HTTP-Adapter für Alarmierungs-Empfänger (Issue #408).
 *
 * Unter `/einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger` werden
 * Empfänger verwaltet. Der Controller liefert nach jeder Mutation die
 * aktualisierte Alarmierung zurück, damit der Client direkt den neuen Zustand
 * verwerten kann.
 */
@ApiTags('alarmierung')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiAlarmierungEmpfaengerExtraModels()
@Controller({ path: 'einsatz/:einsatzId/alarmierungen/:alarmierungId/empfaenger', version: 'alpha' })
export class AlarmierungEmpfaengerController {
  constructor(
    private readonly fuegeHinzuHandler: FuegeEmpfaengerHinzuHandler,
    private readonly entferneHandler: EntferneEmpfaengerHandler,
    private readonly korrigiereHandler: KorrigiereZeitpunktHandler,
    private readonly getByIdHandler: GetAlarmierungByIdQueryHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Empfänger zu Alarmierung hinzufügen' })
  @ApiBody({ schema: FUEGE_EMPFAENGER_HINZU_BODY_SCHEMA })
  @ApiWrappedCreatedResponse(AlarmierungResponseDto, { description: 'Aktualisierte Alarmierung inkl. neuem Empfänger' })
  async hinzufuegen(
    @Param('einsatzId') _einsatzId: string,
    @Param('alarmierungId') alarmierungId: string,
    @Body() dto: FuegeEmpfaengerHinzuDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<AlarmierungResponseDto> {
    const command = unwrapOrThrow(
      FuegeEmpfaengerHinzuCommand.create({
        alarmierungId,
        empfaenger: toDomainRef(dto),
        nameSnapshot: dto.nameSnapshot,
        alarmiertAm: toDate(dto.alarmiertAm),
        createdBy: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.fuegeHinzuHandler.execute(command));
    return AlarmierungMapper.toResponseDto(aggregate);
  }

  @Delete(':empfaengerId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Empfänger aus Alarmierung entfernen' })
  @ApiNoContentResponse({ description: 'Empfänger entfernt' })
  @ApiNotFoundResponse({ description: 'Empfänger oder Alarmierung nicht gefunden' })
  async entfernen(
    @Param('einsatzId') _einsatzId: string,
    @Param('alarmierungId') alarmierungId: string,
    @Param('empfaengerId') empfaengerId: string,
    @CurrentUser() user: ValidatedUser,
  ): Promise<void> {
    const command = unwrapOrThrow(
      EntferneEmpfaengerCommand.create({
        alarmierungId,
        empfaengerId,
        updatedBy: user.userId,
      }),
    );
    unwrapOrThrow(await this.entferneHandler.execute(command));
  }

  @Patch(':empfaengerId/zeitpunkte')
  @ApiOperation({ summary: 'Einen oder mehrere Zeitpunkte eines Empfängers korrigieren' })
  @ApiWrappedResponse(AlarmierungResponseDto, { description: 'Aktualisierte Alarmierung nach Korrektur' })
  async korrigiereZeitpunkte(
    @Param('einsatzId') _einsatzId: string,
    @Param('alarmierungId') alarmierungId: string,
    @Param('empfaengerId') empfaengerId: string,
    @Body() body: KorrigiereZeitpunkteBody,
    @CurrentUser() user: ValidatedUser,
  ): Promise<AlarmierungResponseDto> {
    const felder: ZeitpunktFeld[] = ZEITPUNKT_FELDER.filter((f) => Object.prototype.hasOwnProperty.call(body ?? {}, f));
    if (felder.length === 0) {
      throw new BadRequestException('Mindestens ein Zeitpunkt-Feld muss gesetzt sein');
    }

    for (const feld of felder) {
      const raw = body[feld];
      const wert = parseZeitpunktWert(raw);
      if (wert === undefined) {
        throw new BadRequestException(`Ungültiger Wert für ${feld}: erwartet ISO-String oder null`);
      }

      const command = unwrapOrThrow(
        KorrigiereZeitpunktCommand.create({
          alarmierungId,
          empfaengerId,
          feld,
          wert,
          updatedBy: user.userId,
        }),
      );
      unwrapOrThrow(await this.korrigiereHandler.execute(command));
    }

    const query = unwrapOrThrow(GetAlarmierungByIdQuery.create({ alarmierungId }));
    const aggregate = unwrapOrThrow(await this.getByIdHandler.execute(query));
    if (!aggregate) {
      throw new NotFoundException(`Alarmierung ${alarmierungId} nicht gefunden`);
    }
    return AlarmierungMapper.toResponseDto(aggregate);
  }
}

/**
 * Übersetzt einen DTO-Empfänger in die Command-Input-Form.
 */
function toDomainRef(dto: FuegeEmpfaengerHinzuDto): FuegeEmpfaengerHinzuRef {
  switch (dto.kind) {
    case 'fahrzeug':
      return { kind: 'fahrzeug', fahrzeugId: dto.fahrzeugId };
    case 'person':
      return { kind: 'person', personId: dto.personId };
    case 'einheit':
      return { kind: 'einheit', einheitId: dto.einheitId };
  }
}

/**
 * Parst den Wert eines PATCH-Body-Felds:
 * - `null` → `null` (Zeitpunkt zurücksetzen)
 * - ISO-String → Date
 * - Date-Instanz → Date
 * - ungültiger String → `undefined` (Signal für 400)
 */
function parseZeitpunktWert(raw: string | null | undefined): Date | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDate(value: Date | string | undefined | null): Date | undefined {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
