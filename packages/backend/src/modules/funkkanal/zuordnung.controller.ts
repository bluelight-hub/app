import { AendereZuordnungRolleCommand, AendereZuordnungRolleHandler } from '@/application/funkkanal/commands/aendere-zuordnung-rolle';
import { EntferneZuordnungCommand, EntferneZuordnungHandler } from '@/application/funkkanal/commands/entferne-zuordnung';
import { ZuordneKraftZuKanalCommand, ZuordneKraftZuKanalHandler, type ZuordneKraftRef } from '@/application/funkkanal/commands/zuordne-kraft-zu-kanal';
import { CreateZuordnungDto, FunkkanalResponseDto, UpdateZuordnungRolleDto } from '@/application/funkkanal/dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Body, Controller, Delete, HttpCode, Param, Patch, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FunkkanalMapper } from './mappers/funkkanal.mapper';
import { unwrapOrThrow } from './helpers/funkkanal-error.helper';

/**
 * HTTP-Adapter für Funkkanal-Zuordnungen (Kraft → Kanal).
 *
 * Liefert die aktualisierte Funkkanal-Sicht zurück (inkl. Zuordnungs-Liste),
 * damit der Client direkt den neuen Zustand verwerten kann.
 */
@ApiTags('Funkkanal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@Controller({ path: 'einsatz/:einsatzId/funkkanaele/:kanalId/zuordnungen', version: 'alpha' })
export class FunkkanalZuordnungController {
  constructor(
    private readonly zuordneHandler: ZuordneKraftZuKanalHandler,
    private readonly aendereRolleHandler: AendereZuordnungRolleHandler,
    private readonly entferneHandler: EntferneZuordnungHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Kraft (Fahrzeug/Person/Einheit) einem Kanal zuordnen' })
  @ApiWrappedCreatedResponse(FunkkanalResponseDto, { description: 'Zuordnung erstellt — gibt aktualisierten Kanal zurück' })
  async create(
    @Param('einsatzId') _einsatzId: string,
    @Param('kanalId') kanalId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateZuordnungDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<FunkkanalResponseDto> {
    const command = unwrapOrThrow(
      ZuordneKraftZuKanalCommand.create({
        kanalId,
        kraft: toKraftRef(dto),
        rolle: dto.rolle,
        userId: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.zuordneHandler.execute(command));
    return FunkkanalMapper.toResponseDto(aggregate);
  }

  @Patch(':zuordnungId')
  @ApiOperation({ summary: 'Rolle einer Zuordnung ändern' })
  @ApiWrappedResponse(FunkkanalResponseDto, { description: 'Aktualisierte Funkkanal-Sicht' })
  async updateRolle(
    @Param('einsatzId') _einsatzId: string,
    @Param('kanalId') kanalId: string,
    @Param('zuordnungId') zuordnungId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: UpdateZuordnungRolleDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<FunkkanalResponseDto> {
    const command = unwrapOrThrow(
      AendereZuordnungRolleCommand.create({
        kanalId,
        zuordnungId,
        rolle: dto.rolle,
        userId: user.userId,
      }),
    );
    const aggregate = unwrapOrThrow(await this.aendereRolleHandler.execute(command));
    return FunkkanalMapper.toResponseDto(aggregate);
  }

  @Delete(':zuordnungId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Zuordnung entfernen' })
  @ApiNoContentResponse({ description: 'Zuordnung entfernt' })
  async remove(@Param('einsatzId') _einsatzId: string, @Param('kanalId') kanalId: string, @Param('zuordnungId') zuordnungId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const command = unwrapOrThrow(
      EntferneZuordnungCommand.create({
        kanalId,
        zuordnungId,
        userId: user.userId,
      }),
    );
    unwrapOrThrow(await this.entferneHandler.execute(command));
  }
}

function toKraftRef(dto: CreateZuordnungDto): ZuordneKraftRef {
  if (dto.fahrzeugId) return { kind: 'fahrzeug', fahrzeugId: dto.fahrzeugId };
  if (dto.personId) return { kind: 'person', personId: dto.personId };
  if (dto.einheitId) return { kind: 'einheit', einheitId: dto.einheitId };
  throw new Error('Genau eine Kraft-ID muss gesetzt sein (XOR-Validator hätte das ablehnen müssen)');
}
