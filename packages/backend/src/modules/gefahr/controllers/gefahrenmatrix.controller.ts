import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { GetGefahrenmatrixHandler } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { GetGefahrenmatrixQuery } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.query';
import { UpdateGefahrenmatrixHandler } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixCommand } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.command';
import { GefahrenmatrixResponseDto, GefahrenmatrixBewertungDto, UpdateGefahrenmatrixDto } from '@/application/gefahr/dto';

/**
 * Controller für die Gefahrenmatrix eines Einsatzes (Issue #414).
 */
@ApiTags('Gefahrenmatrix')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({ path: 'einsatz/:einsatzId/gefahrenmatrix', version: 'alpha' })
export class GefahrenmatrixController {
  constructor(
    private readonly getHandler: GetGefahrenmatrixHandler,
    private readonly updateHandler: UpdateGefahrenmatrixHandler,
  ) {}

  @Get()
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Gefahrenmatrix eines Einsatzes abrufen' })
  @ApiWrappedResponse(GefahrenmatrixResponseDto, { description: 'Gefahrenmatrix mit allen Bewertungen' })
  async get(@Param('einsatzId') einsatzId: string) {
    const queryResult = GetGefahrenmatrixQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error ?? 'QUERY_CREATION_FAILED');
    }

    const result = await this.getHandler.execute(queryResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }

  @Put('bewertung')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Einzelne Bewertung in der Gefahrenmatrix setzen/aktualisieren' })
  @ApiWrappedResponse(GefahrenmatrixBewertungDto, { description: 'Aktualisierte Bewertung (null bei Warnstufe KEINE)' })
  async updateBewertung(@Param('einsatzId') einsatzId: string, @Body() dto: UpdateGefahrenmatrixDto, @CurrentUser() user: ValidatedUser) {
    const commandResult = UpdateGefahrenmatrixCommand.create({
      einsatzId,
      gefahrentyp: dto.gefahrentyp,
      schutzobjekt: dto.schutzobjekt,
      warnstufe: dto.warnstufe,
      beschreibung: dto.beschreibung,
      gemeldetVon: dto.gemeldetVon,
      aktualisiertVon: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'COMMAND_CREATION_FAILED');
    }

    const result = await this.updateHandler.execute(commandResult.value);
    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value;
  }
}
